import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    // Fetch all categories with assets and their maintenance requests
    const categories = await prisma.assetCategory.findMany({
      where: { isDeleted: false },
      include: {
        assets: {
          where: { isDeleted: false },
          include: {
            maintenanceRequests: {
              where: { isDeleted: false },
            }
          }
        }
      }
    });

    const categoryReport = categories.map((category) => {
      let totalRequests = 0;
      let resolvedRequests = 0;
      let pendingRequests = 0;
      let activeRequests = 0;
      let totalDowntimeMs = 0;
      let downtimeCount = 0;

      category.assets.forEach((asset) => {
        asset.maintenanceRequests.forEach((req) => {
          totalRequests++;
          if (req.status === 'RESOLVED') {
            resolvedRequests++;
            if (req.startedAt && req.resolvedAt) {
              const diff = req.resolvedAt.getTime() - req.startedAt.getTime();
              if (diff > 0) {
                totalDowntimeMs += diff;
                downtimeCount++;
              }
            }
          } else if (req.status === 'PENDING') {
            pendingRequests++;
          } else if (req.status === 'APPROVED' || req.status === 'TECHNICIAN_ASSIGNED' || req.status === 'IN_PROGRESS') {
            activeRequests++;
          }
        });
      });

      const averageDowntimeHours = downtimeCount > 0 
        ? parseFloat((totalDowntimeMs / (1000 * 60 * 60 * downtimeCount)).toFixed(2)) 
        : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryCode: category.code,
        totalRequests,
        resolvedRequests,
        pendingRequests,
        activeRequests,
        averageDowntimeHours,
      };
    });

    // Fetch top 5 assets with the most maintenance requests
    const topAssetsRaw = await prisma.maintenanceRequest.groupBy({
      by: ['assetId'],
      where: { isDeleted: false },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topAssets = await Promise.all(
      topAssetsRaw.map(async (item) => {
        const asset = await prisma.asset.findUnique({
          where: { id: item.assetId },
          select: { id: true, name: true, assetTag: true, location: true, status: true },
        });
        return {
          asset,
          requestCount: item._count.id,
        };
      })
    );

    return NextResponse.json({
      success: true,
      byCategory: categoryReport,
      topMaintainedAssets: topAssets,
    });
  } catch (error: any) {
    console.error('GET /api/reports/maintenance-frequency error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate maintenance report' },
      { status: 500 }
    );
  }
}
