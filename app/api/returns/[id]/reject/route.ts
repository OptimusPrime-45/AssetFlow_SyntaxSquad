import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const returnRequest = await prisma.assetReturn.findUnique({
      where: { id },
    });

    if (!returnRequest || returnRequest.isDeleted) {
      return NextResponse.json({ success: false, error: 'Return request not found' }, { status: 404 });
    }

    if (returnRequest.status !== 'PENDING_INSPECTION') {
      return NextResponse.json(
        { success: false, error: `Only requests pending inspection can be rejected. Current status: ${returnRequest.status}` },
        { status: 400 }
      );
    }

    let note = '';
    try {
      const body = await request.json();
      note = body.note || '';
    } catch (e) {
      // Body note is optional
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Reject Request
      const updatedRequest = await tx.assetReturn.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          receivedById: auth.employee?.id || null,
          inspectionNotes: note || null,
        },
      });

      // 2. Revert allocation back to ACTIVE
      await tx.assetAllocation.update({
        where: { id: returnRequest.assetAllocationId },
        data: { status: 'ACTIVE' },
      });

      // 3. Log history entry
      await tx.allocationHistory.create({
        data: {
          allocationId: returnRequest.assetAllocationId,
          event: 'RETURN_REJECTED',
          actorId: auth.employee?.id || null,
          previousStatus: 'RETURN_PENDING',
          newStatus: 'ACTIVE',
          note: note || 'Return request rejected; allocation restored to active status',
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Return request rejected successfully',
      returnRequest: updated,
    });
  } catch (error: any) {
    console.error('Reject return error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while rejecting return request' },
      { status: 500 }
    );
  }
}
