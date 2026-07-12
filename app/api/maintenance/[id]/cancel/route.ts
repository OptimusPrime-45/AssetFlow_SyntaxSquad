import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange } from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const cancelSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can cancel maintenance requests' },
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

    // Authorization check: creator, assigned technician, or admin/manager
    const isCreator = auth.employee.id === maintenanceRequest.requestedById;
    const isTechnician = auth.employee.id === maintenanceRequest.assignedTechnicianId;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    if (!isCreator && !isTechnician && !isAdminOrManager) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to cancel this request' },
        { status: 403 }
      );
    }

    const terminalStatuses = ['RESOLVED', 'CANCELLED', 'REJECTED'];
    if (terminalStatuses.includes(maintenanceRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a maintenance request in terminal status: ${maintenanceRequest.status}` },
        { status: 400 }
      );
    }

    let reason = null;
    try {
      const body = await request.json();
      const result = cancelSchema.safeParse(body);
      if (result.success) {
        reason = result.data.reason ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // 2. If it was active (APPROVED, TECHNICIAN_ASSIGNED, or IN_PROGRESS), transition asset status back to AVAILABLE
      const wasActive = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'].includes(maintenanceRequest.status);
      if (wasActive) {
        await applyStatusChange(tx, {
          assetId: maintenanceRequest.assetId,
          to: 'AVAILABLE',
          reason: 'MANUAL_UPDATE',
          changedById: auth.employee!.id,
          note: reason || 'Maintenance request cancelled',
        });
      }

      // 3. Log history
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'CANCELLED',
          actorId: auth.employee!.id,
          previousStatus: maintenanceRequest.status,
          newStatus: 'CANCELLED',
          note: reason || 'Maintenance request cancelled',
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    console.error('Cancel maintenance error:', error);
    if (error.name === 'IllegalTransitionError') {
      return NextResponse.json(
        { success: false, error: `Asset state transition failed: ${error.message}` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling maintenance request' },
      { status: 500 }
    );
  }
}
