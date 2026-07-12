import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can approve bookings' },
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
        { success: false, error: 'Forbidden: You do not have permission to approve this booking' },
        { status: 403 }
      );
    }

    // Status check
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot approve a booking in ${booking.status} status (must be PENDING)` },
        { status: 400 }
      );
    }

    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: {
        status: 'UPCOMING',
        approvedAt: new Date(),
        approvedById: auth.employee.id,
      },
      include: {
        asset: true,
        bookedBy: true,
        approvedBy: true,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Approve booking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while approving booking' },
      { status: 500 }
    );
  }
}
