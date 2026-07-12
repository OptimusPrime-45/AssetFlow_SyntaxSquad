import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateBookingSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  purpose: z.enum(['ROOM', 'VEHICLE', 'EQUIPMENT', 'SPACE', 'OTHER'] as const).optional(),
  audience: z.enum(['INDIVIDUAL', 'DEPARTMENT'] as const).optional(),
  startAt: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date().optional()),
  endAt: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date().optional()),
  bookedForDepartmentId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  locationNote: z.string().nullable().optional(),
  rescheduleReason: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const booking = await prisma.resourceBooking.findFirst({
      where: { id, isDeleted: false },
      include: {
        asset: {
          include: {
            category: true,
            department: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
        bookedForDepartment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Role-based visibility check
    const isOwner = auth.employee?.id === booking.bookedById;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    
    let hasAccess = isOwner || isAdminOrManager;

    if (!hasAccess && auth.user.role === 'DEPARTMENT_HEAD' && auth.employee?.departmentId) {
      const deptId = auth.employee.departmentId;
      // Head can see if booking is for their dept, booked by someone in their dept, or asset belongs to their dept
      const isForDept = booking.bookedForDepartmentId === deptId;
      const isBookedByDeptMember = booking.bookedBy?.departmentId === deptId;
      const isAssetInDept = booking.asset?.departmentId === deptId;

      if (isForDept || isBookedByDeptMember || isAssetInDept) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view this booking' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Fetch booking details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching booking details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const booking = await prisma.resourceBooking.findFirst({
      where: { id, isDeleted: false },
      include: {
        bookedBy: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Permissions check: only owner, admin, or manager can update
    const isOwner = auth.employee?.id === booking.bookedById;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    if (!isOwner && !isAdminOrManager) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own bookings' },
        { status: 403 }
      );
    }

    // Booking status check: completed, cancelled, or rejected bookings cannot be modified
    const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];
    if (terminalStatuses.includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot modify a booking in ${booking.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const startAt = data.startAt || booking.startAt;
    const endAt = data.endAt || booking.endAt;

    // Date validations
    if (data.startAt || data.endAt) {
      const now = new Date();
      if (startAt < now && startAt.getTime() !== booking.startAt.getTime()) {
        return NextResponse.json(
          { success: false, error: 'Rescheduled start time must be in the future' },
          { status: 400 }
        );
      }
      if (startAt >= endAt) {
        return NextResponse.json(
          { success: false, error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    // Overlap validation (if dates are modified)
    if (data.startAt || data.endAt) {
      const overlapping = await prisma.resourceBooking.findFirst({
        where: {
          assetId: booking.assetId,
          id: { not: id },
          isDeleted: false,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (overlapping) {
        return NextResponse.json(
          {
            success: false,
            error: 'This resource is already booked for the rescheduled time slot',
            overlap: {
              id: overlapping.id,
              startAt: overlapping.startAt,
              endAt: overlapping.endAt,
            },
          },
          { status: 409 }
        );
      }
    }

    // Determine status transition logic
    // Rescheduling by standard users resets status to PENDING. Rescheduling by admin/manager keeps status or auto-approves.
    const isDatesModified = data.startAt || data.endAt;
    let targetStatus = booking.status;
    let approvedById = booking.approvedById;
    let approvedAt = booking.approvedAt;

    if (isDatesModified) {
      if (isAdminOrManager) {
        targetStatus = 'UPCOMING';
        approvedById = auth.employee?.id ?? booking.approvedById;
        approvedAt = new Date();
      } else {
        targetStatus = 'PENDING';
        approvedById = null;
        approvedAt = null;
      }
    }

    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : booking.title,
        purpose: data.purpose !== undefined ? data.purpose : booking.purpose,
        audience: data.audience !== undefined ? data.audience : booking.audience,
        startAt,
        endAt,
        bookedForDepartmentId: data.bookedForDepartmentId !== undefined ? data.bookedForDepartmentId : booking.bookedForDepartmentId,
        notes: data.notes !== undefined ? data.notes : booking.notes,
        locationNote: data.locationNote !== undefined ? data.locationNote : booking.locationNote,
        rescheduleReason: data.rescheduleReason !== undefined ? data.rescheduleReason : booking.rescheduleReason,
        status: targetStatus,
        approvedById,
        approvedAt,
      },
      include: {
        asset: true,
        bookedBy: true,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating booking' },
      { status: 500 }
    );
  }
}
