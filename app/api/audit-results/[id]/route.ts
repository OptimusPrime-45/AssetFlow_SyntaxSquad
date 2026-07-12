import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const reviewResultSchema = z.object({
  finding: z.enum(['VERIFIED', 'MISSING', 'DAMAGED'] as const).optional(),
  observedCondition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const).nullable().optional(),
  observedStatus: z.enum(['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'] as const).nullable().optional(),
  observedLocation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reviewed: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can review audit results' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const auditResult = await prisma.auditResult.findFirst({
      where: { id, isDeleted: false },
      include: { asset: true, cycle: { select: { status: true, title: true } } },
    });

    if (!auditResult) {
      return NextResponse.json({ success: false, error: 'Audit result not found' }, { status: 404 });
    }

    // Closing an audit LOCKS its records — that is the whole point of a cycle. This
    // route never looked at the cycle's status, so a closed audit's findings could
    // be rewritten after the fact, resurrecting discrepancies and contradicting the
    // asset changes the closure already applied.
    if (auditResult.cycle.status === 'CLOSED' || auditResult.cycle.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: `Audit cycle "${auditResult.cycle.title}" is ${auditResult.cycle.status}. Its findings are locked and can no longer be changed.`,
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const result = reviewResultSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const finding = data.finding !== undefined ? data.finding : auditResult.finding;
    const observedCondition = data.observedCondition !== undefined ? data.observedCondition : auditResult.observedCondition;
    const observedStatus = data.observedStatus !== undefined ? data.observedStatus : auditResult.observedStatus;
    const observedLocation = data.observedLocation !== undefined ? data.observedLocation : auditResult.observedLocation;
    const notes = data.notes !== undefined ? data.notes : auditResult.notes;

    const reviewedById = data.reviewed === true ? auth.employee.id : data.reviewed === false ? null : auditResult.reviewedById;
    const reviewedAt = data.reviewed === true ? new Date() : data.reviewed === false ? null : auditResult.reviewedAt;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update the AuditResult
      const updatedRes = await tx.auditResult.update({
        where: { id },
        data: {
          finding,
          observedCondition,
          observedStatus,
          observedLocation,
          notes,
          reviewedById,
          reviewedAt,
        },
      });

      // 2. Re-detect discrepancy
      const asset = auditResult.asset;
      const hasFindingDiscrepancy = finding !== 'VERIFIED';
      const hasLocationDiscrepancy = observedLocation !== undefined && observedLocation !== null && observedLocation !== asset.location;
      const hasConditionDiscrepancy = observedCondition !== undefined && observedCondition !== null && observedCondition !== asset.condition;
      const hasStatusDiscrepancy = observedStatus !== undefined && observedStatus !== null && observedStatus !== asset.status;

      const isDiscrepancy = hasFindingDiscrepancy || hasLocationDiscrepancy || hasConditionDiscrepancy || hasStatusDiscrepancy;

      const existingDiscrepancy = await tx.auditDiscrepancy.findFirst({
        where: { cycleId: auditResult.cycleId, assetId: auditResult.assetId, isDeleted: false },
      });

      if (isDiscrepancy) {
        const descParts: string[] = [];
        if (hasFindingDiscrepancy) descParts.push(`Finding indicates asset is ${finding}.`);
        if (hasLocationDiscrepancy) descParts.push(`Location mismatch: expected "${asset.location || 'none'}", observed "${observedLocation}".`);
        if (hasConditionDiscrepancy) descParts.push(`Condition mismatch: expected "${asset.condition}", observed "${observedCondition}".`);
        if (hasStatusDiscrepancy) descParts.push(`Status mismatch: expected "${asset.status}", observed "${observedStatus}".`);

        const severity = finding === 'MISSING' ? 'CRITICAL' : finding === 'DAMAGED' ? 'HIGH' : 'MEDIUM';
        const title = `Audit Discrepancy: ${asset.name} (${asset.assetTag})`;
        const description = descParts.join(' ');

        if (existingDiscrepancy) {
          await tx.auditDiscrepancy.update({
            where: { id: existingDiscrepancy.id },
            data: {
              auditResultId: id,
              status: 'OPEN',
              severity,
              title,
              description,
            },
          });
        } else {
          await tx.auditDiscrepancy.create({
            data: {
              cycleId: auditResult.cycleId,
              assetId: auditResult.assetId,
              auditResultId: id,
              status: 'OPEN',
              severity,
              title,
              description,
            },
          });
        }
      } else {
        if (existingDiscrepancy) {
          await tx.auditDiscrepancy.update({
            where: { id: existingDiscrepancy.id },
            data: {
              isDeleted: true,
            },
          });
        }
      }

      return updatedRes;
    });

    return NextResponse.json({ success: true, result: updated });
  } catch (error: any) {
    console.error('Update audit result error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while reviewing audit result' },
      { status: 500 }
    );
  }
}
