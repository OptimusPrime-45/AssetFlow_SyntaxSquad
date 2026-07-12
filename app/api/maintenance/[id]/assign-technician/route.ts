import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange } from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const assignSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can assign technicians' },
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

    const allowedStatuses = ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(maintenanceRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign technician to a request in ${maintenanceRequest.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = assignSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { technicianId } = result.data;

    // Verify technician employee profile exists
    const technician = await prisma.employee.findUnique({
      where: { id: technicianId },
    });

    if (!technician || technician.isDeleted) {
      return NextResponse.json({ success: false, error: 'Technician employee profile not found' }, { status: 404 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const isPending = maintenanceRequest.status === 'PENDING';
      const targetRequestStatus = isPending ? 'TECHNICIAN_ASSIGNED' : maintenanceRequest.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TECHNICIAN_ASSIGNED';

      // 1. Update status and technician
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          assignedTechnicianId: technicianId,
          technicianAssignedAt: new Date(),
          status: targetRequestStatus,
          // If was pending, we auto-approve it
          ...(isPending
            ? {
                approvedById: auth.employee!.id,
                approvedAt: new Date(),
                approvalNote: 'Approved on technician assignment',
              }
            : {}),
        },
      });

      // 2. If it was pending, transition the asset status to UNDER_MAINTENANCE
      if (isPending) {
        await applyStatusChange(tx, {
          assetId: maintenanceRequest.assetId,
          to: 'UNDER_MAINTENANCE',
          reason: 'MAINTENANCE_APPROVAL',
          changedById: auth.employee!.id,
          note: 'Approved on technician assignment',
        });
      }

      // 3. Log history
      const techName = `${technician.firstName} ${technician.lastName}`;
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'TECHNICIAN_ASSIGNED',
          actorId: auth.employee!.id,
          previousStatus: maintenanceRequest.status,
          newStatus: targetRequestStatus,
          note: `Technician assigned: ${techName} (${technician.employeeCode})`,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    console.error('Assign technician error:', error);
    if (error.name === 'IllegalTransitionError') {
      return NextResponse.json(
        { success: false, error: `Asset state transition failed: ${error.message}` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while assigning technician' },
      { status: 500 }
    );
  }
}
