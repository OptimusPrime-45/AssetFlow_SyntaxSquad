import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, IllegalTransitionError } from '@/lib/assets/state-machine';

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

    // Verify active allocation exists
    const allocation = await prisma.assetAllocation.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!allocation || allocation.isDeleted) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    if (!allocation.isCurrent || allocation.status === 'RETURNED' || allocation.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, error: 'Allocation is already inactive or has been returned' },
        { status: 400 }
      );
    }

    let note = '';
    try {
      const body = await request.json();
      note = body.note || '';
    } catch (e) {
      // Body is optional
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Allocation status to REVOKED, set current to false, and set actualReturnDate
      const updatedAllocation = await tx.assetAllocation.update({
        where: { id },
        data: {
          status: 'REVOKED',
          isCurrent: false,
          actualReturnDate: new Date(),
          returnNote: note || 'Allocation revoked',
        },
      });

      // 2. Transition associated asset status back to AVAILABLE
      await applyStatusChange(tx, {
        assetId: allocation.assetId,
        to: 'AVAILABLE',
        reason: 'RETURN', // returned to inventory
        changedById: auth.employee?.id || null,
        note: note || 'Allocation revoked and asset returned to stock',
      });

      // 3. Log history entry
      await tx.allocationHistory.create({
        data: {
          allocationId: id,
          event: 'REVOKED',
          actorId: auth.employee?.id || null,
          previousStatus: allocation.status,
          newStatus: 'REVOKED',
          note: note || 'Allocation revoked',
        },
      });

      return updatedAllocation;
    });

    return NextResponse.json({
      success: true,
      message: 'Allocation revoked successfully. Asset is now AVAILABLE.',
      allocation: updated,
    });
  } catch (error: any) {
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

    console.error('Revoke allocation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while revoking the allocation' },
      { status: 500 }
    );
  }
}
