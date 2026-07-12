import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange } from '@/lib/assets/state-machine';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const resolveSchema = z.object({
  resolutionNote: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can resolve discrepancies' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const discrepancy = await prisma.auditDiscrepancy.findFirst({
      where: { id, isDeleted: false },
      include: {
        asset: true,
        auditResult: true,
      },
    });

    if (!discrepancy) {
      return NextResponse.json({ success: false, error: 'Discrepancy not found' }, { status: 404 });
    }

    if (['RESOLVED', 'DISMISSED'].includes(discrepancy.status)) {
      return NextResponse.json(
        { success: false, error: `Discrepancy is already in ${discrepancy.status} status` },
        { status: 400 }
      );
    }

    let resolutionNote = null;
    try {
      const body = await request.json();
      const result = resolveSchema.safeParse(body);
      if (result.success) {
        resolutionNote = result.data.resolutionNote ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updatedDiscrepancy = await prisma.$transaction(async (tx) => {
      // 1. Mark discrepancy resolved
      const updated = await tx.auditDiscrepancy.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolutionNote: resolutionNote || 'Resolved by administrator',
          resolvedById: auth.employee!.id,
          resolvedAt: new Date(),
        },
      });

      // 2. Synchronize asset values if auditResult exists
      if (discrepancy.auditResult) {
        const result = discrepancy.auditResult;
        const asset = discrepancy.asset;

        const obsLocation = result.observedLocation;
        const obsCondition = result.observedCondition;
        const obsStatus = result.observedStatus;

        // If finding was MISSING, we might transition asset to LOST status
        let targetStatus = obsStatus || asset.status;
        if (result.finding === 'MISSING') {
          targetStatus = 'LOST';
        }

        if (targetStatus && targetStatus !== asset.status) {
          await applyStatusChange(tx, {
            assetId: discrepancy.assetId,
            to: targetStatus,
            reason: 'AUDIT_VERIFICATION',
            changedById: auth.employee!.id,
            condition: obsCondition || undefined,
            note: resolutionNote || 'Synchronized status on resolving audit discrepancy',
          });

          // Sync location if provided
          await tx.asset.update({
            where: { id: discrepancy.assetId },
            data: {
              location: obsLocation !== undefined && obsLocation !== null ? obsLocation : asset.location,
            },
          });
        } else {
          // If status didn't change, just update location and condition directly
          await tx.asset.update({
            where: { id: discrepancy.assetId },
            data: {
              condition: obsCondition !== undefined && obsCondition !== null ? obsCondition : asset.condition,
              location: obsLocation !== undefined && obsLocation !== null ? obsLocation : asset.location,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, discrepancy: updatedDiscrepancy });
  } catch (error: any) {
    console.error('Resolve discrepancy error:', error);
    if (error.name === 'IllegalTransitionError') {
      return NextResponse.json(
        { success: false, error: `Asset state transition failed: ${error.message}` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while resolving discrepancy' },
      { status: 500 }
    );
  }
}
