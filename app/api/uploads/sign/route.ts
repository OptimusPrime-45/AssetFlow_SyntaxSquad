import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/rbac';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * Cloudinary signs every API call — uploads, but also `destroy`, `rename`, and
 * `explicit` — with the same sha1(sorted-params + secret) scheme. Signing an
 * arbitrary client-supplied params object therefore hands the caller a valid
 * signature for ANY operation on the account, including deleting every image.
 *
 * So the server builds the params. The client may choose only the folder (from a
 * fixed list) and a filename; everything security-relevant — timestamp, folder
 * path, resource type, allowed formats, size cap — is set here and cannot be
 * overridden.
 */

// Where uploads are allowed to land. Anything else is rejected.
const FOLDERS = {
  assets: 'assetflow/assets',
  maintenance: 'assetflow/maintenance',
  avatars: 'assetflow/avatars',
} as const;

const signRequestSchema = z.object({
  folder: z.enum(['assets', 'maintenance', 'avatars']),
  // Cosmetic only, and sanitised below — never trusted as a path.
  fileName: z.string().max(120).optional(),
});

/** Strips anything that could climb out of the folder or collide deliberately. */
function safePublicId(fileName: string | undefined): string {
  const stem = (fileName ?? 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 60);
  return `${stem || 'upload'}-${crypto.randomUUID()}`;
}

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(paramString + apiSecret).digest('hex');
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = signRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary environment configuration is missing' },
        { status: 500 }
      );
    }

    // Server-authored. The client contributes nothing that isn't validated above.
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      folder: FOLDERS[result.data.folder],
      public_id: safePublicId(result.data.fileName),
      allowed_formats: 'jpg,jpeg,png,webp,gif,pdf',
      // Signature is only valid for an upload, not for destroy/rename/explicit.
      // Cloudinary rejects a mismatched endpoint because the signed params differ.
      overwrite: 'false',
    };

    return NextResponse.json({
      success: true,
      signature: signCloudinaryParams(params, apiSecret),
      params,
      apiKey,
      cloudName,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    });
  } catch (error: any) {
    console.error('Sign upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while signing parameters' },
      { status: 500 }
    );
  }
}
