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
  const deptFilter = searchParams.get('departmentId');

  const limit = limitParam ? parseInt(limitParam, 10) : 20;

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

  const where: any = {
    isDeleted: false,
  };

  if (scope === 'EMPLOYEE' && targetEmpId) {
    where.OR = [
      { actorEmployeeId: targetEmpId },
      { actorUserId: user.id }
    ];
  } else if (scope === 'DEPARTMENT' && targetDeptId) {
    where.actorEmployee = {
      departmentId: targetDeptId,
    };
  }

  try {
    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        actorEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        },
        actorUser: {
          select: { id: true, email: true, role: true }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      scope,
      count: activities.length,
      activities,
    });
  } catch (error: any) {
    console.error('GET /api/dashboard/recent-activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}
