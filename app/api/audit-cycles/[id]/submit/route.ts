import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can submit audit assignments' },
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

    if (cycle.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: `Cannot submit assignments: Audit cycle is in ${cycle.status} status (must be IN_PROGRESS)` },
        { status: 400 }
      );
    }

    const assignment = await prisma.auditAssignment.findUnique({
      where: {
        cycleId_auditorId: {
          cycleId: id,
          auditorId: auth.employee.id,
        },
      },
    });

    if (!assignment || assignment.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'No active auditor assignment found for you in this cycle' },
        { status: 404 }
      );
    }

    const updated = await prisma.auditAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error: any) {
    console.error('Submit audit assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while submitting audit assignment' },
      { status: 500 }
    );
  }
}
