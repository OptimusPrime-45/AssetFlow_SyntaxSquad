import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user, employee } = auth;
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  // Authorization and scoping check for Department Heads
  if (user.role === 'DEPARTMENT_HEAD' && employee?.departmentId) {
    const lowerType = type.toLowerCase();
    if (lowerType === 'department' && id !== employee.departmentId) {
      return NextResponse.json({ success: false, error: 'Forbidden: Access to department logs restricted' }, { status: 403 });
    }
    if (lowerType === 'employee') {
      const targetEmp = await prisma.employee.findUnique({ where: { id } });
      if (targetEmp && targetEmp.departmentId !== employee.departmentId) {
        return NextResponse.json({ success: false, error: 'Forbidden: Employee not in your department' }, { status: 403 });
      }
    }
    if (lowerType === 'asset') {
      const targetAsset = await prisma.asset.findUnique({ where: { id } });
      if (targetAsset && targetAsset.departmentId !== employee.departmentId) {
        return NextResponse.json({ success: false, error: 'Forbidden: Asset not in your department' }, { status: 403 });
      }
    }
  }

  const where: any = {
    entityType: { equals: type, mode: 'insensitive' },
    entityId: id,
    isDeleted: false,
  };

  // If regular Employee, they are only allowed to see logs they caused (acted on)
  if (user.role === 'EMPLOYEE' && employee) {
    where.OR = [
      { actorEmployeeId: employee.id },
      { actorUserId: user.id }
    ];
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
    console.error(`GET /api/activity-logs/entity/${type}/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entity activity logs' },
      { status: 500 }
    );
  }
}
