import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange } from '@/lib/assets/state-machine';
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

    const allowedStatuses = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(maintenanceRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot resolve a maintenance request in ${maintenanceRequest.status} status` },
        { status: 400 }
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

      // 2. Transition the asset status back to AVAILABLE
      await applyStatusChange(tx, {
        assetId: maintenanceRequest.assetId,
        to: 'AVAILABLE',
        reason: 'MAINTENANCE_RESOLUTION',
        changedById: auth.employee!.id,
        note: resolutionNote || 'Maintenance request resolved',
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
    console.error('Resolve maintenance error:', error);
    if (error.name === 'IllegalTransitionError') {
      return NextResponse.json(
        { success: false, error: `Asset state transition failed: ${error.message}` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while resolving maintenance request' },
      { status: 500 }
    );
  }
}
