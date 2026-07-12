import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, ActiveAllocationError, IllegalTransitionError } from '@/lib/assets/state-machine';
import { currentAllocation, holderName } from '@/lib/allocations/current';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const resolveSchema = z.object({
  resolutionNote: z.string().nullable().optional(),
  technicianNote: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can resolve maintenance requests' },
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
        { success: false, error: 'Forbidden: Only the assigned technician or an administrator can resolve this request' },
        { status: 403 }
      );
    }

    // Work must actually have started. The README's chain is
    // APPROVED -> TECHNICIAN_ASSIGNED -> IN_PROGRESS -> RESOLVED; accepting
    // APPROVED here let a request be resolved with no technician and a null
    // startedAt, i.e. a repair that never happened.
    if (maintenanceRequest.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        {
          success: false,
          error: `Only an IN_PROGRESS request can be resolved. This one is ${maintenanceRequest.status}.`,
        },
        { status: 409 }
      );
    }

    let resolutionNote = null;
    let technicianNote = null;
    try {
      const body = await request.json();
      const result = resolveSchema.safeParse(body);
      if (result.success) {
        resolutionNote = result.data.resolutionNote ?? null;
        technicianNote = result.data.technicianNote ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Update the request status and notes
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolutionNote,
          technicianNote,
        },
      });

      // 2. Give the asset back to whoever it belonged to.
      //
      // An asset can break *while someone is holding it* (ALLOCATED ->
      // UNDER_MAINTENANCE is legal), and nothing closes their allocation when the
      // repair starts — the laptop is still Carol's, it's just in the shop. So
      // resolution must return it to ALLOCATED, not AVAILABLE.
      //
      // Forcing AVAILABLE here was a deadlock: the state machine refuses to shelve
      // an asset that still has a live allocation, so the transaction rolled back
      // and the request stuck in IN_PROGRESS with the asset stuck UNDER_MAINTENANCE,
      // permanently. Only an asset nobody holds goes back on the shelf.
      const held = await currentAllocation(tx, maintenanceRequest.assetId);

      await applyStatusChange(tx, {
        assetId: maintenanceRequest.assetId,
        to: held ? 'ALLOCATED' : 'AVAILABLE',
        reason: 'MAINTENANCE_RESOLUTION',
        changedById: auth.employee!.id,
        note:
          resolutionNote ||
          (held
            ? `Maintenance resolved; asset returned to ${holderName(held)}`
            : 'Maintenance resolved; asset returned to stock'),
      });

      // 3. Log history
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'RESOLVED',
          actorId: auth.employee!.id,
          previousStatus: maintenanceRequest.status,
          newStatus: 'RESOLVED',
          note: resolutionNote || 'Maintenance request resolved',
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    if (error instanceof ActiveAllocationError || error instanceof IllegalTransitionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    console.error('Resolve maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while resolving maintenance request' },
      { status: 500 }
    );
  }
}
