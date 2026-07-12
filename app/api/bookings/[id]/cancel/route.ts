import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const cancelBookingSchema = z.object({
  cancellationReason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const booking = await prisma.resourceBooking.findFirst({
      where: { id, isDeleted: false },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Permissions check: only owner, admin, or manager can cancel
    const isOwner = auth.employee?.id === booking.bookedById;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    if (!isOwner && !isAdminOrManager) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only cancel your own bookings' },
        { status: 403 }
      );
    }

    // If already cancelled, completed or rejected
    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Booking is already cancelled' }, { status: 400 });
    }
    if (booking.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Cannot cancel a completed booking' }, { status: 400 });
    }
    if (booking.status === 'REJECTED') {
      return NextResponse.json({ success: false, error: 'Cannot cancel a rejected booking' }, { status: 400 });
    }

    let cancellationReason = null;
    try {
      const body = await request.json();
      const result = cancelBookingSchema.safeParse(body);
      if (result.success) {
        cancellationReason = result.data.cancellationReason ?? null;
      }
    } catch {
      // Body can be empty, ignore parse errors
    }

    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || 'Cancelled by user',
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling booking' },
      { status: 500 }
    );
  }
}
