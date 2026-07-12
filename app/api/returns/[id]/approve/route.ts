import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, IllegalTransitionError } from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const AssetConditionEnum = z.enum([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);

const approveReturnSchema = z.object({
  conditionOnReturn: AssetConditionEnum.optional(),
  inspectionNotes: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const returnRequest = await prisma.assetReturn.findUnique({
      where: { id },
      include: {
        assetAllocation: {
          include: { asset: true },
        },
      },
    });

    if (!returnRequest || returnRequest.isDeleted) {
      return NextResponse.json({ success: false, error: 'Return request not found' }, { status: 404 });
    }

    if (returnRequest.status !== 'PENDING_INSPECTION') {
      return NextResponse.json(
        { success: false, error: `Only requests pending inspection can be approved. Current status: ${returnRequest.status}` },
        { status: 400 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body is optional
    }

    const result = approveReturnSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { conditionOnReturn, inspectionNotes } = result.data;
    const finalCondition = conditionOnReturn || returnRequest.conditionOnReturn || returnRequest.assetAllocation.asset.condition;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Return Request status to APPROVED
      const updatedRequest = await tx.assetReturn.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          inspectedAt: new Date(),
          receivedById: auth.employee?.id || null,
          inspectionNotes: inspectionNotes || null,
          conditionOnReturn: finalCondition,
        },
      });

      // 2. Mark allocation as returned (inactive)
      await tx.assetAllocation.update({
        where: { id: returnRequest.assetAllocationId },
        data: {
          status: 'RETURNED',
          isCurrent: false,
          actualReturnDate: new Date(),
          returnNote: inspectionNotes || 'Return approved',
        },
      });

      // 3. Move Asset status back to AVAILABLE and update condition via state machine
      await applyStatusChange(tx, {
        assetId: returnRequest.assetAllocation.assetId,
        to: 'AVAILABLE',
        reason: 'RETURN',
        changedById: auth.employee?.id || null,
        condition: finalCondition,
        note: inspectionNotes || 'Asset returned and approved',
      });

      // 4. Log history entry
      await tx.allocationHistory.create({
        data: {
          allocationId: returnRequest.assetAllocationId,
          event: 'RETURN_APPROVED',
          actorId: auth.employee?.id || null,
          previousStatus: 'RETURN_PENDING',
          newStatus: 'RETURNED',
          note: inspectionNotes || 'Return approved and asset returned to stock',
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Return request approved and asset returned successfully.',
      returnRequest: updated,
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

    console.error('Approve return error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while approving return request' },
      { status: 500 }
    );
  }
}
