import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  // The README grants Dept Heads exactly one report: the allocation summary for
  // their own department. They were 403'd from it. Adding the role alone would
  // have handed them every department, so the scope filter below goes in with it.
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const isDeptHead = auth.user.role === 'DEPARTMENT_HEAD';
  const ownDepartmentId = auth.employee?.departmentId ?? null;

  if (isDeptHead && !ownDepartmentId) {
    return NextResponse.json(
      { success: false, error: 'You are not assigned to a department' },
      { status: 403 }
    );
  }

  try {
    const departments = await prisma.department.findMany({
      where: {
        isDeleted: false,
        ...(isDeptHead ? { id: ownDepartmentId! } : {}),
      },
      include: {
        assets: {
          where: { isDeleted: false },
          select: { acquisitionCost: true }
        },
      }
    });

    const report = await Promise.all(
      departments.map(async (dept) => {
        const totalAssets = dept.assets.length;
        
        // Sum acquisitionCost of assets assigned to department
        const totalValue = dept.assets.reduce((sum, asset) => {
          const cost = asset.acquisitionCost ? Number(asset.acquisitionCost) : 0;
          return sum + cost;
        }, 0);

        // Active allocations directly to department
        const directAllocationsCount = await prisma.assetAllocation.count({
          where: {
            allocatedToDepartmentId: dept.id,
            status: 'ACTIVE',
            isCurrent: true,
            isDeleted: false,
          }
        });

        // Active allocations to employees of this department
        const employeeAllocationsCount = await prisma.assetAllocation.count({
          where: {
            allocatedToEmployee: {
              departmentId: dept.id,
            },
            status: 'ACTIVE',
            isCurrent: true,
            isDeleted: false,
          }
        });

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          departmentCode: dept.code,
          totalAssetsCount: totalAssets,
          totalAssetValue: parseFloat(totalValue.toFixed(2)),
          directAllocationsCount,
          employeeAllocationsCount,
          totalActiveAllocations: directAllocationsCount + employeeAllocationsCount,
        };
      })
    );

    return NextResponse.json({ success: true, departmentAllocations: report });
  } catch (error: any) {
    console.error('GET /api/reports/department-allocation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate department allocation report' },
      { status: 500 }
    );
  }
}
