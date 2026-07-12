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
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    if (cycle.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: `Cannot close an audit cycle in ${cycle.status} status (must be IN_PROGRESS)` },
        { status: 400 }
      );
    }

    const updated = await prisma.auditCycle.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: any) {
    console.error('Close audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while closing audit cycle' },
      { status: 500 }
    );
  }
}
