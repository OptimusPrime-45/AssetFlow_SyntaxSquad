import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, ActiveAllocationError, IllegalTransitionError } from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const approveSchema = z.object({
  note: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can approve maintenance requests' },
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

    if (maintenanceRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot approve a maintenance request in ${maintenanceRequest.status} status` },
        { status: 400 }
      );
    }

    let note = null;
    try {
      const body = await request.json();
      const result = approveSchema.safeParse(body);
      if (result.success) {
        note = result.data.note ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Transition the request status
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: auth.employee.id,
          approvedAt: new Date(),
          approvalNote: note,
        },
      });

      // 2. Transition the asset status to UNDER_MAINTENANCE using the state-machine helper
      await applyStatusChange(tx, {
        assetId: maintenanceRequest.assetId,
        to: 'UNDER_MAINTENANCE',
        reason: 'MAINTENANCE_APPROVAL',
        changedById: auth.employee.id,
        note: note || 'Maintenance request approved',
      });

      // 3. Log history
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'APPROVED',
          actorId: auth.employee.id,
          previousStatus: 'PENDING',
          newStatus: 'APPROVED',
          note: note || 'Maintenance request approved',
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    console.error('Approve maintenance error:', error);
    // If it's an illegal state transition error from the state machine
    if (error instanceof ActiveAllocationError || error instanceof IllegalTransitionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while approving maintenance request' },
      { status: 500 }
    );
  }
}
