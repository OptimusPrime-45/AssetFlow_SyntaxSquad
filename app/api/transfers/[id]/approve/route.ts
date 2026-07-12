import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { canDecideTransfer } from '@/lib/allocations/approval';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  // Dept Heads approve transfers within their own department (README); Asset
  // Managers and Admins approve any. canDecideTransfer() enforces the boundary.
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
        { success: false, error: `Only PENDING transfers can be approved. Current status: ${transfer.status}` },
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
      // 1. Approve Request
      const updatedRequest = await tx.assetTransferRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: auth.employee?.id || null,
          reviewedAt: new Date(),
          decisionNote: note || 'Transfer approved',
        },
      });

      // 2. Add history note to allocation
      if (transfer.currentAllocationId) {
        await tx.allocationHistory.create({
          data: {
            allocationId: transfer.currentAllocationId,
            event: 'TRANSFER_APPROVED',
            actorId: auth.employee?.id || null,
            previousStatus: 'TRANSFER_PENDING',
            newStatus: 'TRANSFER_PENDING',
            note: note || 'Transfer request approved',
          },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer request approved successfully',
      transfer: updated,
    });
  } catch (error: any) {
    console.error('Approve transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while approving the transfer' },
      { status: 500 }
    );
  }
}
