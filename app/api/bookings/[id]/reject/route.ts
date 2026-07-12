import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const rejectBookingSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can reject bookings' },
      { status: 400 }
    );
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

    // Role-based authorization
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    let isAuthorizedHead = false;

    if (auth.user.role === 'DEPARTMENT_HEAD' && auth.employee.departmentId) {
      const isForMyDept = booking.bookedForDepartmentId === auth.employee.departmentId;
      const isBookerInMyDept = booking.bookedBy?.departmentId === auth.employee.departmentId;
      if (isForMyDept || isBookerInMyDept) {
        isAuthorizedHead = true;
      }
    }

    if (!isAdminOrManager && !isAuthorizedHead) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to reject this booking' },
        { status: 403 }
      );
    }

    // Status check
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot reject a booking in ${booking.status} status (must be PENDING)` },
        { status: 400 }
      );
    }

    let rejectionReason = null;
    try {
      const body = await request.json();
      const result = rejectBookingSchema.safeParse(body);
      if (result.success) {
        rejectionReason = result.data.reason ?? null;
      }
    } catch {
      // Body can be empty, ignore parse errors
    }

    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        cancellationReason: rejectionReason || 'Rejected by approver',
      },
      include: {
        asset: true,
        bookedBy: true,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Reject booking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while rejecting booking' },
      { status: 500 }
    );
  }
}
