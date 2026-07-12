import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const addAuditorSchema = z.object({
  auditorId: z.string().min(1, 'Auditor ID is required'),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
    });

    if (!cycle || cycle.isDeleted) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    const assignments = await prisma.auditAssignment.findMany({
      where: { cycleId: id, isDeleted: false },
      include: {
        auditor: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, auditors: assignments });
  } catch (error: any) {
    console.error('Fetch auditors error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching auditors' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can assign auditors' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    const terminalStatuses = ['CLOSED', 'CANCELLED'];
    if (terminalStatuses.includes(cycle.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign auditors to an audit cycle in ${cycle.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = addAuditorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { auditorId, notes } = result.data;

    // Verify auditor employee exists
    const auditor = await prisma.employee.findFirst({
      where: { id: auditorId, isDeleted: false },
    });

    if (!auditor) {
      return NextResponse.json({ success: false, error: 'Auditor employee profile not found' }, { status: 404 });
    }

    // Upsert assignment (if exists but isDeleted: true, we reactivate it)
    const existing = await prisma.auditAssignment.findUnique({
      where: {
        cycleId_auditorId: {
          cycleId: id,
          auditorId,
        },
      },
    });

    let assignment;
    if (existing) {
      assignment = await prisma.auditAssignment.update({
        where: { id: existing.id },
        data: {
          isDeleted: false,
          status: 'ASSIGNED',
          assignedById: auth.employee.id,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
    } else {
      assignment = await prisma.auditAssignment.create({
        data: {
          cycleId: id,
          auditorId,
          assignedById: auth.employee.id,
          status: 'ASSIGNED',
          notes,
        },
      });
    }

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error: any) {
    console.error('Assign auditor error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while assigning auditor' },
      { status: 500 }
    );
  }
}
