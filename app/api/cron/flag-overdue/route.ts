import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/cron-auth';

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Fetch allocations that are past expected return date, active and current
    const overdueAllocations = await prisma.assetAllocation.findMany({
      where: {
        isCurrent: true,
        isDeleted: false,
        status: 'ACTIVE',
        expectedReturnDate: { lt: now },
      },
      include: {
        asset: true,
        allocatedToEmployee: true,
      },
    });

    if (overdueAllocations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue allocations to flag',
        flaggedCount: 0,
      });
    }

    const updatedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const allocation of overdueAllocations) {
        // 1. Update status to OVERDUE
        await tx.assetAllocation.update({
          where: { id: allocation.id },
          data: { status: 'OVERDUE' },
        });

        // 2. Create history log
        await tx.allocationHistory.create({
          data: {
            allocationId: allocation.id,
            event: 'OVERDUE_FLAGGED',
            note: `System cron flagged allocation as overdue. Expected return date: ${allocation.expectedReturnDate?.toISOString()}`,
          },
        });

        // 3. Create Notification for the Employee if allocated
        if (allocation.allocatedToEmployee?.userId) {
          await tx.notification.create({
            data: {
              recipientUserId: allocation.allocatedToEmployee.userId,
              type: 'OVERDUE_RETURN',
              priority: 'HIGH',
              title: 'Overdue Asset Return Reminder',
              message: `The asset "${allocation.asset.name}" was expected to be returned by ${allocation.expectedReturnDate?.toLocaleDateString()}. Please return it as soon as possible.`,
              entityType: 'AssetAllocation',
              entityId: allocation.id,
            },
          });
        }
        count++;
      }
      return count;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully flagged ${updatedCount} overdue allocations`,
      flaggedCount: updatedCount,
    });
  } catch (error: any) {
    console.error('Flag overdue error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while running the flag-overdue job' },
      { status: 500 }
    );
  }
}
