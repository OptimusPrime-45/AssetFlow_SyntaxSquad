import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateAuditCycleSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional(),
  scopeType: z.enum(['DEPARTMENT', 'LOCATION', 'CUSTOM'] as const).optional(),
  departmentId: z.string().nullable().optional(),
  locationFilter: z.string().nullable().optional(),
  startDate: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date().optional()),
  endDate: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date().optional()),
});

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
      include: {
        department: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignments: {
          where: { isDeleted: false },
          include: {
            auditor: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
          },
        },
        _count: {
          select: {
            assignments: { where: { isDeleted: false } },
            results: { where: { isDeleted: false } },
            discrepancies: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    // Access control: Admin, manager, department head of cycle, or assigned auditor
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    const isDeptHead = auth.user.role === 'DEPARTMENT_HEAD' && auth.employee?.departmentId === cycle.departmentId;
    const isAssignedAuditor = cycle.assignments.some((a) => a.auditorId === auth.employee?.id);

    if (!isAdminOrManager && !isDeptHead && !isAssignedAuditor) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view this audit cycle' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, cycle });
  } catch (error: any) {
    console.error('Fetch audit cycle details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching audit cycle details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    // Cycle details can only be edited in DRAFT or SCHEDULED statuses
    const modifiableStatuses = ['DRAFT', 'SCHEDULED'];
    if (!modifiableStatuses.includes(cycle.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot modify an audit cycle in ${cycle.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateAuditCycleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const startDate = data.startDate || cycle.startDate;
    const endDate = data.endDate || cycle.endDate;

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date must be strictly before end date' },
        { status: 400 }
      );
    }

    const scopeType = data.scopeType || cycle.scopeType;

    // Validate department/location if scope type is updated
    if (data.scopeType) {
      if (scopeType === 'DEPARTMENT' && !data.departmentId && !cycle.departmentId) {
        return NextResponse.json(
          { success: false, error: 'Department ID is required when scope type is DEPARTMENT' },
          { status: 400 }
        );
      }
      if (scopeType === 'LOCATION' && !data.locationFilter && !cycle.locationFilter) {
        return NextResponse.json(
          { success: false, error: 'Location filter is required when scope type is LOCATION' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.auditCycle.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : cycle.title,
        description: data.description !== undefined ? data.description : cycle.description,
        scopeType,
        departmentId: scopeType === 'DEPARTMENT' ? (data.departmentId !== undefined ? data.departmentId : cycle.departmentId) : null,
        locationFilter: scopeType === 'LOCATION' ? (data.locationFilter !== undefined ? data.locationFilter : cycle.locationFilter) : null,
        startDate,
        endDate,
      },
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: any) {
    console.error('Update audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating audit cycle' },
      { status: 500 }
    );
  }
}
