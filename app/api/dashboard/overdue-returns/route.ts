import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user, employee } = auth;
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const deptFilter = searchParams.get('departmentId');

  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  let scope = 'GLOBAL';
  let targetDeptId: string | null = null;
  let targetEmpId: string | null = null;

  if (user.role === 'DEPARTMENT_HEAD') {
    scope = 'DEPARTMENT';
    targetDeptId = employee?.departmentId || null;
  } else if (user.role === 'EMPLOYEE') {
    scope = 'EMPLOYEE';
    targetEmpId = employee?.id || null;
  } else if (deptFilter) {
    scope = 'DEPARTMENT';
    targetDeptId = deptFilter;
  }

  const now = new Date();
  const where: any = {
    status: 'ACTIVE',
    isCurrent: true,
    expectedReturnDate: { lt: now },
    isDeleted: false,
  };

  if (scope === 'EMPLOYEE' && targetEmpId) {
    where.allocatedToEmployeeId = targetEmpId;
  } else if (scope === 'DEPARTMENT' && targetDeptId) {
    where.OR = [
      { allocatedToDepartmentId: targetDeptId },
      { allocatedToEmployee: { departmentId: targetDeptId } }
    ];
  }

  try {
    const overdueAllocations = await prisma.assetAllocation.findMany({
      where,
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, serialNumber: true }
        },
        allocatedToEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        },
        allocatedToDepartment: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { expectedReturnDate: 'asc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.assetAllocation.count({ where });

    return NextResponse.json({
      success: true,
      scope,
      count: overdueAllocations.length,
      totalCount,
      overdueAllocations,
    });
  } catch (error: any) {
    console.error('GET /api/dashboard/overdue-returns error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overdue returns' },
      { status: 500 }
    );
  }
}
