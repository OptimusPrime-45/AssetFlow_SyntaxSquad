import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

    // Query maintenance requests
    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: { assetId: id, isDeleted: false },
      include: {
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      maintenanceRequests,
    });
  } catch (error: any) {
    console.error('Fetch asset maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching maintenance requests' },
      { status: 500 }
    );
  }
}
