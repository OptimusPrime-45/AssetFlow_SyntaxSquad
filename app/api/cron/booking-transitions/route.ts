import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/cron-auth';

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Transition UPCOMING -> ONGOING (if startAt <= now and endAt > now)
      const upcomingToOngoing = await tx.resourceBooking.updateMany({
        where: {
          isDeleted: false,
          status: 'UPCOMING',
          startAt: { lte: now },
          endAt: { gt: now },
        },
        data: {
          status: 'ONGOING',
        },
      });

      // 2. Transition ONGOING -> COMPLETED (if endAt <= now)
      const ongoingToCompleted = await tx.resourceBooking.updateMany({
        where: {
          isDeleted: false,
          status: 'ONGOING',
          endAt: { lte: now },
        },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });

      return {
        upcomingToOngoingCount: upcomingToOngoing.count,
        ongoingToCompletedCount: ongoingToCompleted.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Transitions completed: ${result.upcomingToOngoingCount} upcoming->ongoing, ${result.ongoingToCompletedCount} ongoing->completed`,
      transitions: result,
    });
  } catch (error: any) {
    console.error('Booking transitions cron error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while transitioning bookings' },
      { status: 500 }
    );
  }
}
