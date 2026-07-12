import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        assignments: { where: { isDeleted: false } },
      },
    });

    if (!cycle || cycle.isDeleted) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    // Access check: Admin, manager, department head, or assigned auditor
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    const isDeptHead = auth.user.role === 'DEPARTMENT_HEAD' && auth.employee?.departmentId === cycle.departmentId;
    const isAssignedAuditor = cycle.assignments.some((a) => a.auditorId === auth.employee?.id);

    if (!isAdminOrManager && !isDeptHead && !isAssignedAuditor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view these discrepancies' },
        { status: 403 }
      );
    }

    const discrepancies = await prisma.auditDiscrepancy.findMany({
      where: { cycleId: id, isDeleted: false },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, location: true, condition: true, status: true },
        },
        auditResult: {
          include: {
            auditor: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
          },
        },
        resolvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, discrepancies });
  } catch (error: any) {
    console.error('Fetch cycle discrepancies error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching discrepancies' },
      { status: 500 }
    );
  }
}
