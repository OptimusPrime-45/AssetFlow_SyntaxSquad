import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    // Authenticate user
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

    // Query status history
    const history = await prisma.assetStatusHistory.findMany({
      where: { assetId: id },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('Fetch status history error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching status history' },
      { status: 500 }
    );
  }
}
