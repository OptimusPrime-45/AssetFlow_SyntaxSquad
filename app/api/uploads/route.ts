import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/rbac';
import {
  UPLOAD_FOLDERS,
  uploadImageToCloudinary,
  type UploadFolderKey,
} from '@/lib/cloudinary/upload';

export async function POST(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'A file is required' },
        { status: 400 }
      );
    }

    if (typeof folder !== 'string' || !(folder in UPLOAD_FOLDERS)) {
      return NextResponse.json(
        { success: false, error: 'A valid upload folder is required' },
        { status: 400 }
      );
    }

    const result = await uploadImageToCloudinary(file, folder as UploadFolderKey, file.name);

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      secure_url: result.secureUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while uploading the file' },
      { status: 500 }
    );
  }
}
