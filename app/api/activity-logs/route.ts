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

  const actorEmployeeId = searchParams.get('actorEmployeeId');
  const actorUserId = searchParams.get('actorUserId');
  const actionParam = searchParams.get('action');
  const entityTypeParam = searchParams.get('entityType');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const limit = Math.min(Math.max(1, parseInt(limitParam ?? '', 10) || 50), 100);
  const offset = Math.max(0, parseInt(offsetParam ?? '', 10) || 0);

  const where: any = {
    isDeleted: false,
  };

  // Scope, failing CLOSED.
  //
  // The old if/else-if chain keyed on the *employee record*, so a DEPARTMENT_HEAD
  // with no departmentId — or an EMPLOYEE with no employee row — fell past every
  // scoped branch into the unscoped tail and received the entire system-wide log.
  // Each role now either gets its filter or is denied.
  if (user.role === 'EMPLOYEE') {
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'No employee profile is linked to this account' },
        { status: 403 }
      );
    }
    where.OR = [{ actorEmployeeId: employee.id }, { actorUserId: user.id }];
  } else if (user.role === 'DEPARTMENT_HEAD') {
    if (!employee?.departmentId) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to a department' },
        { status: 403 }
      );
    }
    where.actorEmployee = {
      departmentId: employee.departmentId,
      ...(actorEmployeeId ? { id: actorEmployeeId } : {}),
    };
  } else if (actorEmployeeId) {
    // ADMIN / ASSET_MANAGER — org-wide, optionally filtered to one actor.
    where.actorEmployeeId = actorEmployeeId;
  }

  if (actorUserId && user.role !== 'EMPLOYEE') {
    where.actorUserId = actorUserId;
  }

  if (actionParam) {
    where.action = actionParam;
  }

  if (entityTypeParam) {
    where.entityType = { equals: entityTypeParam, mode: 'insensitive' };
  }

  // beforeData/afterData are free-form JSON snapshots of whatever a route chose to
  // record — the natural place for a user-mutation to dump a whole row, password
  // hash included. Along with the actor's IP and user-agent, they go to Admins
  // only. Everyone else gets who/what/when.
  const isAdmin = user.role === 'ADMIN';

  try {
    const logs = await prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        description: true,
        occurredAt: true,
        beforeData: isAdmin,
        afterData: isAdmin,
        metadata: isAdmin,
        ipAddress: isAdmin,
        userAgent: isAdmin,
        actorEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        },
        actorUser: {
          select: { id: true, role: true, ...(isAdmin ? { email: true } : {}) }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.activityLog.count({ where });

    return NextResponse.json({
      success: true,
      count: logs.length,
      totalCount,
      logs,
    });
  } catch (error: any) {
    console.error('GET /api/activity-logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
