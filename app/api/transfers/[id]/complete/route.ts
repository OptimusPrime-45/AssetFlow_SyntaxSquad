import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { IllegalTransitionError } from '@/lib/assets/state-machine';
import { currentAllocation, holderName } from '@/lib/allocations/current';

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

    const transfer = await prisma.assetTransferRequest.findUnique({
      where: { id },
    });

    if (!transfer || transfer.isDeleted) {
      return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });
    }

    // Approval is a gate, not a formality: Requested -> Approved -> Re-allocated.
    // Completing a PENDING request would skip the approver entirely.
    if (transfer.status !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: `Only an APPROVED transfer can be completed. This one is ${transfer.status}.`,
        },
        { status: 409 }
      );
    }

    if (!transfer.toEmployeeId && !transfer.toDepartmentId) {
      return NextResponse.json(
        { success: false, error: 'Transfer request has no recipient' },
        { status: 400 }
      );
    }

    let note = '';
    try {
      const body = await request.json();
      note = body.note || '';
    } catch {
      // Body note is optional
    }

    const completedRequest = await prisma.$transaction(async (tx) => {
      // Re-read the asset's live allocation rather than trusting the one captured
      // when the request was raised. If the asset was returned and re-allocated in
      // the meantime, that stored id points at a stale row — evicting it would
      // leave the real holder in place and create a *second* current allocation.
      const held = await currentAllocation(tx, transfer.assetId);

      if (!held) {
        throw new StaleTransferError('This asset is no longer allocated to anyone.');
      }

      if (transfer.currentAllocationId && held.id !== transfer.currentAllocationId) {
        throw new StaleTransferError(
          `This asset has changed hands since the transfer was requested — it is now held by ${holderName(held)}. Raise a new transfer request.`,
        );
      }

      // Close the outgoing allocation first, so the asset is free before the new
      // one is created. The partial unique index enforces that ordering anyway.
      await tx.assetAllocation.update({
        where: { id: held.id },
        data: {
          status: 'TRANSFERRED',
          isCurrent: false,
          actualReturnDate: new Date(),
          returnNote: note || 'Transferred to new holder',
        },
      });

      await tx.allocationHistory.create({
        data: {
          allocationId: held.id,
          event: 'TRANSFERRED',
          actorId: auth.employee?.id || null,
          previousStatus: 'TRANSFER_PENDING',
          newStatus: 'TRANSFERRED',
          note: note || 'Asset transferred to new holder',
        },
      });

      // A transfer to a *department* moves ownership of the asset. A transfer to
      // an employee only moves custody — it must not silently reassign the asset
      // to whichever department that person happens to sit in.
      if (transfer.toDepartmentId) {
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: { departmentId: transfer.toDepartmentId },
        });
      }

      const newAllocation = await tx.assetAllocation.create({
        data: {
          assetId: transfer.assetId,
          allocatedToEmployeeId: transfer.toEmployeeId || null,
          allocatedToDepartmentId: transfer.toDepartmentId || null,
          allocatedById: auth.employee?.id || null,
          approvedById: transfer.reviewedById || auth.employee?.id || null,
          status: 'ACTIVE',
          isCurrent: true,
          allocationNote: note || `Received via transfer request ${transfer.id}`,
        },
      });

      await tx.allocationHistory.create({
        data: {
          allocationId: newAllocation.id,
          event: 'ALLOCATED',
          actorId: auth.employee?.id || null,
          newStatus: 'ACTIVE',
          note: `Allocation created via transfer completion. Request ID: ${transfer.id}`,
        },
      });

      // Record the change of hands on the asset's own timeline. The asset is
      // already ALLOCATED and stays ALLOCATED, so this writes a TRANSFER entry to
      // AssetStatusHistory rather than moving the status.
      await tx.assetStatusHistory.create({
        data: {
          assetId: transfer.assetId,
          fromStatus: 'ALLOCATED',
          toStatus: 'ALLOCATED',
          reason: 'TRANSFER',
          note: note || `Transferred to ${transfer.toEmployeeId ? 'a new holder' : 'a new department'}`,
          changedById: auth.employee?.id || null,
        },
      });

      return tx.assetTransferRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          decisionNote: note || transfer.decisionNote || 'Transfer completed',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer completed. The asset has changed hands.',
      transfer: completedRequest,
    });
  } catch (error: any) {
    if (error instanceof StaleTransferError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }

    if (error instanceof IllegalTransitionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          currentStatus: error.from,
          allowedTransitions: error.allowed,
        },
        { status: 409 }
      );
    }

    console.error('Complete transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while completing the transfer' },
      { status: 500 }
    );
  }
}

/** The world moved on since this transfer was requested. */
class StaleTransferError extends Error {}
