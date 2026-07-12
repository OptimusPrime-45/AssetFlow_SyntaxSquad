import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user, employee } = auth;

  try {
    const { id } = await params;

    const transfer = await prisma.assetTransferRequest.findUnique({
      where: { id },
    });

    if (!transfer || transfer.isDeleted) {
      return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Only PENDING transfers can be cancelled. Current status: ${transfer.status}` },
        { status: 400 }
      );
    }

    // Authorize: Admin, Asset Manager, or the requester Employee
    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'ASSET_MANAGER' ||
      (employee && transfer.requestedById === employee.id);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to cancel this request' },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cancel Request
      const updatedRequest = await tx.assetTransferRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. Revert current allocation back to ACTIVE
      if (transfer.currentAllocationId) {
        await tx.assetAllocation.update({
          where: { id: transfer.currentAllocationId },
          data: { status: 'ACTIVE' },
        });

        // 3. Log history entry
        await tx.allocationHistory.create({
          data: {
            allocationId: transfer.currentAllocationId,
            event: 'CANCELLED',
            actorId: employee?.id || null,
            previousStatus: 'TRANSFER_PENDING',
            newStatus: 'ACTIVE',
            note: 'Transfer request cancelled; allocation restored to active',
          },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer request cancelled successfully',
      transfer: updated,
    });
  } catch (error: any) {
    console.error('Cancel transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling the transfer' },
      { status: 500 }
    );
  }
}
