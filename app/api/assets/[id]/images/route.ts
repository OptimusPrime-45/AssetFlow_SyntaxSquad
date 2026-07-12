import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  fileName: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  isPrimary: z.boolean().default(false),
  altText: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const images = await prisma.assetImage.findMany({
      where: { assetId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, images });
  } catch (error: any) {
    console.error('Fetch images error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = sessionData;
    if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = createImageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const newImage = await prisma.$transaction(async (tx) => {
      // If setting this image as primary, unset other primary images for this asset
      if (data.isPrimary) {
        await tx.assetImage.updateMany({
          where: { assetId: id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.assetImage.create({
        data: {
          assetId: id,
          url: data.url,
          fileName: data.fileName || null,
          mimeType: data.mimeType || null,
          fileSize: data.fileSize || null,
          isPrimary: data.isPrimary,
          altText: data.altText || null,
          sortOrder: data.sortOrder,
        },
      });
    });

    return NextResponse.json({ success: true, image: newImage }, { status: 201 });
  } catch (error: any) {
    console.error('Attach image error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while attaching the image' },
      { status: 500 }
    );
  }
}
