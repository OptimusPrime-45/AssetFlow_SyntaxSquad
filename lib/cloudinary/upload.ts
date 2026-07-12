import crypto from 'crypto';

export const UPLOAD_FOLDERS = {
  assets: 'assetflow/assets',
  maintenance: 'assetflow/maintenance',
  avatars: 'assetflow/avatars',
} as const;

export type UploadFolderKey = keyof typeof UPLOAD_FOLDERS;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function getCloudinaryConfig() {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return null;
  }

  return { apiSecret, apiKey, cloudName };
}

/** Strips anything that could climb out of the folder or collide deliberately. */
export function safePublicId(fileName: string | undefined): string {
  const stem = (fileName ?? 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 60);
  return `${stem || 'upload'}-${crypto.randomUUID()}`;
}

export function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string
): string {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(paramString + apiSecret).digest('hex');
}

export function buildSignedUploadParams(folder: UploadFolderKey, fileName?: string) {
  return {
    timestamp: String(Math.floor(Date.now() / 1000)),
    folder: UPLOAD_FOLDERS[folder],
    public_id: safePublicId(fileName),
  };
}

export function validateImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, WebP, and GIF images are allowed';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 5 MB or smaller';
  }

  return null;
}

type CloudinaryUploadResult = {
  secure_url?: string;
  error?: { message?: string };
};

function getUnsignedUploadPreset(): string | null {
  return process.env.CLOUDINARY_UNSIGNED_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || null;
}

async function postToCloudinary(
  cloudName: string,
  formData: FormData
): Promise<{ secureUrl: string } | { error: string }> {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const uploadData = (await uploadRes.json().catch(() => ({}))) as CloudinaryUploadResult;

  if (uploadRes.status !== 200 || !uploadData.secure_url) {
    return {
      error: uploadData.error?.message || 'Failed to upload to Cloudinary',
    };
  }

  return { secureUrl: uploadData.secure_url };
}

async function uploadWithSignedParams(
  file: File,
  folder: UploadFolderKey,
  fileName: string | undefined,
  config: NonNullable<ReturnType<typeof getCloudinaryConfig>>
): Promise<{ secureUrl: string } | { error: string }> {
  const params = buildSignedUploadParams(folder, fileName);
  const signature = signCloudinaryParams(params, config.apiSecret);

  const uploadFormData = new FormData();
  for (const [key, value] of Object.entries(params)) {
    uploadFormData.append(key, value);
  }
  uploadFormData.append('api_key', config.apiKey);
  uploadFormData.append('signature', signature);
  uploadFormData.append('file', file);

  return postToCloudinary(config.cloudName, uploadFormData);
}

async function uploadWithUnsignedPreset(
  file: File,
  folder: UploadFolderKey,
  fileName: string | undefined,
  config: NonNullable<ReturnType<typeof getCloudinaryConfig>>,
  uploadPreset: string
): Promise<{ secureUrl: string } | { error: string }> {
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('upload_preset', uploadPreset);
  uploadFormData.append('folder', UPLOAD_FOLDERS[folder]);
  uploadFormData.append('public_id', safePublicId(fileName ?? file.name));

  return postToCloudinary(config.cloudName, uploadFormData);
}

export async function uploadImageToCloudinary(
  file: File,
  folder: UploadFolderKey,
  fileName?: string
): Promise<{ secureUrl: string } | { error: string }> {
  const config = getCloudinaryConfig();
  if (!config) {
    return { error: 'Cloudinary environment configuration is missing' };
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const unsignedPreset = getUnsignedUploadPreset();
  const signedResult = await uploadWithSignedParams(file, folder, fileName, config);
  if ('secureUrl' in signedResult) {
    return signedResult;
  }

  const permissionsError =
    signedResult.error.toLowerCase().includes('missing permissions') ||
    signedResult.error.toLowerCase().includes('forbidden');

  if (permissionsError && unsignedPreset) {
    const unsignedResult = await uploadWithUnsignedPreset(
      file,
      folder,
      fileName,
      config,
      unsignedPreset
    );
    if ('secureUrl' in unsignedResult) {
      return unsignedResult;
    }
    return unsignedResult;
  }

  if (permissionsError) {
    return {
      error:
        'Cloudinary rejected the upload because this API key lacks create permission. ' +
        'In the Cloudinary console, grant your API key create access for uploads, or set ' +
        'CLOUDINARY_UNSIGNED_PRESET to an unsigned upload preset name.',
    };
  }

  return signedResult;
}
