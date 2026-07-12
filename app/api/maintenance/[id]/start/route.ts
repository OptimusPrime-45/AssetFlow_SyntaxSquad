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
      { success: false, error: 'Only employees with an associated profile can start maintenance requests' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: { id, isDeleted: false },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    // Authorization check: only assigned technician or admin/manager
    const isAssigned = auth.employee.id === maintenanceRequest.assignedTechnicianId;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    if (!isAssigned && !isAdminOrManager) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the assigned technician or an administrator can start this request' },
        { status: 403 }
      );
    }

    if (maintenanceRequest.status !== 'TECHNICIAN_ASSIGNED') {
      return NextResponse.json(
        { success: false, error: `Cannot start a maintenance request in ${maintenanceRequest.status} status (must be TECHNICIAN_ASSIGNED)` },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'STARTED',
          actorId: auth.employee!.id,
          previousStatus: 'TECHNICIAN_ASSIGNED',
          newStatus: 'IN_PROGRESS',
          note: 'Maintenance execution started',
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    console.error('Start maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while starting maintenance request' },
      { status: 500 }
    );
  }
}
