import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, ActiveAllocationError, IllegalTransitionError } from '@/lib/assets/state-machine';
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

    // Approval is a gate, not a formality. PENDING used to be accepted here, and
    // the route would silently stamp approvedBy/approvedAt and push the asset to
    // UNDER_MAINTENANCE — an approval with no APPROVED event in the history, so the
    // audit trail showed a decision nobody made. Approve it first.
    const allowedStatuses = ['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(maintenanceRequest.status)) {
      return NextResponse.json(
        {
          success: false,
          error:
            maintenanceRequest.status === 'PENDING'
              ? 'Approve this request before assigning a technician.'
              : `Cannot assign a technician to a request in ${maintenanceRequest.status} status`,
        },
        { status: 409 }
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
      // Reassigning mid-repair keeps the request IN_PROGRESS; otherwise the
      // assignment moves it to TECHNICIAN_ASSIGNED. The asset is already
      // UNDER_MAINTENANCE (approval put it there), so no status change here.
      const targetRequestStatus =
        maintenanceRequest.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TECHNICIAN_ASSIGNED';

      // 1. Update status and technician
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          assignedTechnicianId: technicianId,
          technicianAssignedAt: new Date(),
          status: targetRequestStatus,
        },
      });

      // 2. Log history
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
    if (error instanceof ActiveAllocationError || error instanceof IllegalTransitionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while assigning technician' },
      { status: 500 }
    );
  }
}
