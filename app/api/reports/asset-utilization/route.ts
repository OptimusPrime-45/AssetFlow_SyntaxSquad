import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const categories = await prisma.assetCategory.findMany({
      where: { isDeleted: false },
      include: {
        assets: {
          where: { isDeleted: false },
          select: { status: true }
        }
      }
    });

    const utilizationData = categories.map((category) => {
      const total = category.assets.length;
      const allocated = category.assets.filter(a => a.status === 'ALLOCATED').length;
      const available = category.assets.filter(a => a.status === 'AVAILABLE').length;
      const underMaintenance = category.assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
      const utilizationRate = total > 0 ? parseFloat(((allocated / total) * 100).toFixed(2)) : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryCode: category.code,
        totalAssets: total,
        allocatedAssets: allocated,
        availableAssets: available,
        underMaintenanceAssets: underMaintenance,
        utilizationRate,
      };
    });

    return NextResponse.json({ success: true, utilization: utilizationData });
  } catch (error: any) {
    console.error('GET /api/reports/asset-utilization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate asset utilization' },
      { status: 500 }
    );
  }
}
