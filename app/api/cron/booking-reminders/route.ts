import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/cron-auth';

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch approved bookings starting in the next 24 hours
    const upcomingBookings = await prisma.resourceBooking.findMany({
      where: {
        isDeleted: false,
        status: 'UPCOMING',
        startAt: {
          gte: now,
          lte: next24Hours,
        },
      },
      include: {
        asset: true,
        bookedBy: true,
      },
    });

    if (upcomingBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming bookings require reminders',
        remindersSent: 0,
      });
    }

    let remindersSent = 0;

    await prisma.$transaction(async (tx) => {
      for (const booking of upcomingBookings) {
        // De-duplicate: check if a reminder notification was already sent
        const existing = await tx.notification.findFirst({
          where: {
            recipientUserId: booking.bookedBy.userId,
            type: 'BOOKING_REMINDER',
            entityType: 'ResourceBooking',
            entityId: booking.id,
            isDeleted: false,
          },
        });

        if (!existing) {
          await tx.notification.create({
            data: {
              recipientUserId: booking.bookedBy.userId,
              type: 'BOOKING_REMINDER',
              priority: 'MEDIUM',
              title: 'Upcoming Booking Reminder',
              message: `Your booking for "${booking.title}" (Asset: ${booking.asset.name}) is scheduled for ${booking.startAt.toLocaleString()}.`,
              entityType: 'ResourceBooking',
              entityId: booking.id,
            },
          });
          remindersSent++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed reminders. Sent ${remindersSent} notifications.`,
      remindersSent,
    });
  } catch (error: any) {
    console.error('Booking reminders cron error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while running booking-reminders job' },
      { status: 500 }
    );
  }
}
