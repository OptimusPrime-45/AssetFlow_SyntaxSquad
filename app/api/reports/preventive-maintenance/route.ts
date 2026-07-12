import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    // 1. Open/Active maintenance requests
    const openRequests = await prisma.maintenanceRequest.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'] },
        isDeleted: false,
      },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, condition: true, status: true }
        },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { priority: 'desc' }
    });

    // 2. At-risk assets (condition POOR/DAMAGED, or >= 3 maintenance requests lifetime)
    const atRiskAssets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        OR: [
          { condition: { in: ['DAMAGED', 'POOR'] } },
          {
            maintenanceRequests: {
              some: {} // Has at least one maintenance request
            }
          }
        ]
      },
      include: {
        category: {
          select: { name: true }
        },
        _count: {
          select: { maintenanceRequests: true }
        }
      }
    });

    const formattedAtRisk = atRiskAssets
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        category: asset.category.name,
        condition: asset.condition,
        status: asset.status,
        maintenanceCount: asset._count.maintenanceRequests,
      }))
      .filter((asset) => asset.condition === 'DAMAGED' || asset.condition === 'POOR' || asset.maintenanceCount >= 3)
      .sort((a, b) => b.maintenanceCount - a.maintenanceCount);

    return NextResponse.json({
      success: true,
      openRequests,
      atRiskAssets: formattedAtRisk,
    });
  } catch (error: any) {
    console.error('GET /api/reports/preventive-maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate preventive maintenance report' },
      { status: 500 }
    );
  }
}
