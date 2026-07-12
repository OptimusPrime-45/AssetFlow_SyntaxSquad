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

  const limit = Math.min(Math.max(1, parseInt(limitParam ?? '', 10) || 20), 100);

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

  // Fail CLOSED. The scoped branches below are guarded by `scope === X && targetId`,
  // so a null id used to fall through to the unfiltered org-wide query — handing an
  // Employee with no profile, or a Dept Head with no department, the whole company's
  // data while still labelling the response with their scope. Deny instead.
  if (scope === 'EMPLOYEE' && !targetEmpId) {
    return NextResponse.json(
      { success: false, error: 'No employee profile is linked to this account' },
      { status: 403 }
    );
  }
  if (scope === 'DEPARTMENT' && !targetDeptId) {
    return NextResponse.json(
      { success: false, error: 'You are not assigned to a department' },
      { status: 403 }
    );
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
        // No email: this feed reaches Dept Heads and Employees, and a name is
        // enough to say who did what. Returning addresses turned the activity
        // feed into a directory dump.
        actorUser: {
          select: { id: true, role: true }
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
