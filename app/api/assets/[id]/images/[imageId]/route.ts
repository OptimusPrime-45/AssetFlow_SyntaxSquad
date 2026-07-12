import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string; imageId: string }>;
}

const updateImageSchema = z.object({
  altText: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = sessionData;
    if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: assetId, imageId } = await params;

    // Verify image exists and belongs to the asset
    const image = await prisma.assetImage.findFirst({
      where: { id: imageId, assetId },
    });

    if (!image) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateImageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const updatedImage = await prisma.$transaction(async (tx) => {
      // If setting this image as primary, unset other primary images for this asset
      if (data.isPrimary && !image.isPrimary) {
        await tx.assetImage.updateMany({
          where: { assetId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const updateData: any = {};
      if (data.altText !== undefined) updateData.altText = data.altText;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;

      return tx.assetImage.update({
        where: { id: imageId },
        data: updateData,
      });
    });

    return NextResponse.json({ success: true, image: updatedImage });
  } catch (error: any) {
    console.error('Update image error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating the image' },
      { status: 500 }
    );
  }
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

    const { id: assetId, imageId } = await params;

    // Verify image exists and belongs to the asset
    const image = await prisma.assetImage.findFirst({
      where: { id: imageId, assetId },
    });

    if (!image) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    // Delete image
    await prisma.assetImage.delete({
      where: { id: imageId },
    });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while deleting the image' },
      { status: 500 }
    );
  }
}
