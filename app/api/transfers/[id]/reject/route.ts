import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { canDecideTransfer } from '@/lib/allocations/approval';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  // Same approvers as /approve — whoever may say yes may also say no.
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']);
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

    const denial = await canDecideTransfer(
      {
        role: auth.user.role,
        employeeId: auth.employee?.id ?? null,
        departmentId: auth.employee?.departmentId ?? null,
      },
      id
    );
    if (denial) {
      return NextResponse.json({ success: false, error: denial }, { status: 403 });
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Only PENDING transfers can be rejected. Current status: ${transfer.status}` },
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
      const updatedRequest = await tx.assetTransferRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: auth.employee?.id || null,
          reviewedAt: new Date(),
          decisionNote: note || 'Transfer rejected',
        },
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
            event: 'TRANSFER_REJECTED',
            actorId: auth.employee?.id || null,
            previousStatus: 'TRANSFER_PENDING',
            newStatus: 'ACTIVE',
            note: note || 'Transfer request rejected; allocation restored to active',
          },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer request rejected successfully',
      transfer: updated,
    });
  } catch (error: any) {
    console.error('Reject transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while rejecting the transfer' },
      { status: 500 }
    );
  }
}
