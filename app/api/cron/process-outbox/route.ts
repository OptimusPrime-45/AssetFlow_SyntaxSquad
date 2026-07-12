import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/cron-auth';

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Fetch a batch of 50 pending or failed events (with < 3 attempts) that are ready to run
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        availableAt: { lte: now },
        OR: [
          { status: 'PENDING' },
          {
            status: 'FAILED',
            attempts: { lt: 3 },
          },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    if (pendingEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No outbox events to process',
        processedCount: 0,
        failedCount: 0,
      });
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      // 1. Mark status as PROCESSING
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSING' },
      });

      try {
        // 2. Simulate dispatching the event
        console.log(`[Outbox Event Dispatch] ID: ${event.id}, Type: ${event.eventType}, Aggregate: ${event.aggregateType} (${event.aggregateId})`);
        console.log('Payload:', JSON.stringify(event.payload));

        // 3. Mark as PROCESSED
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
            attempts: event.attempts + 1,
            lastError: null,
          },
        });
        processedCount++;
      } catch (err: any) {
        console.error(`Failed to process outbox event ${event.id}:`, err);
        
        // 4. Update status to FAILED, record attempts and lastError
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            attempts: event.attempts + 1,
            lastError: err.message || 'Unknown processing error',
          },
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Outbox processing cycle completed: ${processedCount} processed, ${failedCount} failed`,
      processedCount,
      failedCount,
    });
  } catch (error: any) {
    console.error('Process outbox error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while processing outbox' },
      { status: 500 }
    );
  }
}
