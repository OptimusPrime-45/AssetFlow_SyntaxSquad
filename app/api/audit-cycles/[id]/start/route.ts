import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
      include: {
        assignments: {
          where: { isDeleted: false },
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    const startableStatuses = ['DRAFT', 'SCHEDULED'];
    if (!startableStatuses.includes(cycle.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot start an audit cycle in ${cycle.status} status` },
        { status: 400 }
      );
    }

    if (cycle.assignments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot start audit cycle: At least one auditor must be assigned' },
        { status: 400 }
      );
    }

    const updated = await prisma.auditCycle.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
      },
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: any) {
    console.error('Start audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while starting audit cycle' },
      { status: 500 }
    );
  }
}
