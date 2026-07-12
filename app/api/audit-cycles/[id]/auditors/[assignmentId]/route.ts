import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{
    id: string;
    assignmentId: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id, assignmentId } = await params;

    const assignment = await prisma.auditAssignment.findFirst({
      where: { id: assignmentId, cycleId: id, isDeleted: false },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Auditor assignment not found' }, { status: 404 });
    }

    // Verify cycle status (cannot remove auditors if cycle is CLOSED or CANCELLED)
    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
    });

    if (cycle && ['CLOSED', 'CANCELLED'].includes(cycle.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot remove auditors from an audit cycle in ${cycle.status} status` },
        { status: 400 }
      );
    }

    // Perform soft delete
    await prisma.auditAssignment.update({
      where: { id: assignmentId },
      data: {
        isDeleted: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Auditor assignment removed successfully' });
  } catch (error: any) {
    console.error('Delete auditor assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while deleting auditor assignment' },
      { status: 500 }
    );
  }
}
