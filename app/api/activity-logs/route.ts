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

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const where: any = {
    isDeleted: false,
  };

  // Scope checks
  if (user.role === 'EMPLOYEE' && employee) {
    where.OR = [
      { actorEmployeeId: employee.id },
      { actorUserId: user.id }
    ];
  } else if (user.role === 'DEPARTMENT_HEAD' && employee?.departmentId) {
    where.actorEmployee = {
      departmentId: employee.departmentId,
      ...(actorEmployeeId ? { id: actorEmployeeId } : {}),
    };
  } else if (actorEmployeeId) {
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

  try {
    const logs = await prisma.activityLog.findMany({
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
