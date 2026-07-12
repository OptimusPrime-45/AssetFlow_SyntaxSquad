import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import {
  applyStatusChange,
  allowedTransitions,
  ActiveAllocationError,
  IllegalTransitionError,
  MANUAL_REASONS,
} from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const AssetStatusEnum = z.enum([
  'AVAILABLE',
  'ALLOCATED',
  'RESERVED',
  'UNDER_MAINTENANCE',
  'LOST',
  'RETIRED',
  'DISPOSED',
]);

const AssetConditionEnum = z.enum([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);

// Only manual reasons are accepted here. A status change that belongs to a
// workflow (allocation, maintenance approval, audit closure) is written by that
// workflow through applyStatusChange(), not by hand through this endpoint.
const ManualReasonEnum = z.enum(
  MANUAL_REASONS as unknown as [string, ...string[]]
);

const statusUpdateSchema = z.object({
  status: AssetStatusEnum,
  condition: AssetConditionEnum.optional(),
  reason: ManualReasonEnum.default('MANUAL_UPDATE'),
  note: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const existingAsset = await prisma.asset.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!existingAsset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = statusUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, condition, reason, note } = result.data;

    const updatedAsset = await prisma.$transaction((tx) =>
      applyStatusChange(tx, {
        assetId: id,
        to: status,
        condition,
        reason: reason as (typeof MANUAL_REASONS)[number],
        note: note ?? null,
        changedById: auth.employee?.id ?? null,
      })
    );

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (error: any) {
    // Trying to shelve an asset someone still holds. Point them at the return
    // flow rather than letting them orphan a live allocation.
    if (error instanceof ActiveAllocationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          conflict: { heldBy: error.holder, allocationId: error.allocationId },
        },
        { status: 409 }
      );
    }

    // An illegal move is the caller's mistake, not a server fault. Tell them what
    // they asked for and what they could have asked for instead.
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

    console.error('Update status error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating the status' },
      { status: 500 }
    );
  }
}

/** The moves that are legal from where this asset is right now — lets the UI
 *  render only the buttons that will actually work. */
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const asset = await prisma.asset.findFirst({
    where: { id, isDeleted: false },
    select: { status: true },
  });

  if (!asset) {
    return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    currentStatus: asset.status,
    allowedTransitions: allowedTransitions(asset.status),
  });
}
