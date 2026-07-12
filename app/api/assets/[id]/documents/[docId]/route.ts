import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = sessionData;
    if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: assetId, docId } = await params;

    // Verify document exists and belongs to the asset
    const document = await prisma.assetDocument.findFirst({
      where: { id: docId, assetId },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete document
    await prisma.assetDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while deleting the document' },
      { status: 500 }
    );
  }
}
