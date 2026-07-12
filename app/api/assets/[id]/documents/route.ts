import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Invalid document URL'),
  fileName: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
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

    const documents = await prisma.assetDocument.findMany({
      where: { assetId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error('Fetch documents error:', error);
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
    const result = createDocumentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const newDocument = await prisma.assetDocument.create({
      data: {
        assetId: id,
        title: data.title,
        url: data.url,
        fileName: data.fileName || null,
        mimeType: data.mimeType || null,
        fileSize: data.fileSize || null,
        description: data.description || null,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json({ success: true, document: newDocument }, { status: 201 });
  } catch (error: any) {
    console.error('Attach document error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while attaching the document' },
      { status: 500 }
    );
  }
}
