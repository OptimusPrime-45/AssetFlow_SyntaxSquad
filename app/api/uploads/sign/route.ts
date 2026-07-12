import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';
import {
  buildSignedUploadParams,
  getCloudinaryConfig,
  signCloudinaryParams,
} from '@/lib/cloudinary/upload';

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

const signRequestSchema = z.object({
  folder: z.enum(['assets', 'maintenance', 'avatars']),
  // Cosmetic only, and sanitised below — never trusted as a path.
  fileName: z.string().max(120).optional(),
});

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

    const config = getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary environment configuration is missing' },
        { status: 500 }
      );
    }

    const params = buildSignedUploadParams(result.data.folder, result.data.fileName);

    return NextResponse.json({
      success: true,
      signature: signCloudinaryParams(params, config.apiSecret),
      params,
      apiKey: config.apiKey,
      cloudName: config.cloudName,
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    });
  } catch (error) {
    console.error('Sign upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while signing parameters' },
      { status: 500 }
    );
  }
}
