import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, ActiveAllocationError, IllegalTransitionError } from '@/lib/assets/state-machine';
import { currentAllocation } from '@/lib/allocations/current';
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

    const isCreator = auth.employee.id === maintenanceRequest.requestedById;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    const terminalStatuses = ['RESOLVED', 'CANCELLED', 'REJECTED'];
    if (terminalStatuses.includes(maintenanceRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a maintenance request in terminal status: ${maintenanceRequest.status}` },
        { status: 400 }
      );
    }

    // Once a request is approved, the asset is UNDER_MAINTENANCE and cancelling it
    // moves the asset's status. That is an Asset Manager's call, not the reporter's
    // — otherwise any Employee could withdraw an approved repair and pull the asset
    // out of maintenance. Before approval, the reporter may withdraw their own
    // request freely, because nothing has moved yet.
    if (!isAdminOrManager) {
      if (!isCreator) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You do not have permission to cancel this request' },
          { status: 403 }
        );
      }
      if (maintenanceRequest.status !== 'PENDING') {
        return NextResponse.json(
          {
            success: false,
            error:
              'This request has already been approved. Ask an Asset Manager to cancel it.',
          },
          { status: 403 }
        );
      }
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

      // 2. If approval had already moved the asset into UNDER_MAINTENANCE, take it
      // back out — to its holder if it still has one, otherwise to the shelf. Same
      // rule as /resolve: forcing AVAILABLE while an allocation is live deadlocks.
      const wasActive = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'].includes(maintenanceRequest.status);
      if (wasActive) {
        const held = await currentAllocation(tx, maintenanceRequest.assetId);
        await applyStatusChange(tx, {
          assetId: maintenanceRequest.assetId,
          to: held ? 'ALLOCATED' : 'AVAILABLE',
          // Not MANUAL_UPDATE: that reason is reserved for hand-driven Asset Manager
          // edits, and using it here would misattribute a workflow event in the
          // asset's audit trail.
          reason: 'MAINTENANCE_RESOLUTION',
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
    if (error instanceof ActiveAllocationError || error instanceof IllegalTransitionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling maintenance request' },
      { status: 500 }
    );
  }
}
