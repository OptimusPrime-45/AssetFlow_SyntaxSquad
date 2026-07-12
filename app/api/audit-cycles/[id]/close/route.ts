import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import {
  applyStatusChange,
  applyConditionChange,
  IllegalTransitionError,
} from '@/lib/assets/state-machine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    if (cycle.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: `Cannot close an audit cycle in ${cycle.status} status (must be IN_PROGRESS)` },
        { status: 409 }
      );
    }

    // Closing is where an audit stops being paperwork and changes the real record:
    // assets the auditors couldn't find become LOST, damaged ones have their
    // condition written down, and the cycle locks. It happens in one transaction so
    // a failure halfway cannot leave half the findings applied.
    const outcome = await prisma.$transaction(async (tx) => {
      // Claim the cycle first, conditional on it still being IN_PROGRESS. Two
      // concurrent closes would otherwise both pass the check above and both apply
      // every status change, duplicating the history rows.
      const claimed = await tx.auditCycle.updateMany({
        where: { id, status: 'IN_PROGRESS' },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      if (claimed.count === 0) {
        throw new AlreadyClosedError();
      }

      const results = await tx.auditResult.findMany({
        where: { cycleId: id, isDeleted: false },
        include: { asset: { select: { id: true, assetTag: true, status: true } } },
      });

      const applied: string[] = [];
      const skipped: { assetTag: string; reason: string }[] = [];

      for (const result of results) {
        if (result.finding === 'VERIFIED') continue;

        try {
          if (result.finding === 'MISSING') {
            // The auditor physically could not find it. Whoever it was allocated to
            // still shows as holding it — that is exactly what makes it a
            // discrepancy, and the allocation stays open for someone to chase.
            await applyStatusChange(tx, {
              assetId: result.assetId,
              to: 'LOST',
              reason: 'AUDIT_DISCREPANCY',
              changedById: result.auditorId,
              note: `Marked missing during audit "${cycle.title}"`,
            });
            applied.push(result.asset.assetTag);
          } else if (result.finding === 'DAMAGED') {
            // Present but damaged: the asset hasn't moved, so record the condition
            // rather than forcing a status transition.
            await applyConditionChange(tx, {
              assetId: result.assetId,
              condition: result.observedCondition ?? 'DAMAGED',
              reason: 'AUDIT_DISCREPANCY',
              changedById: result.auditorId,
              note: `Found damaged during audit "${cycle.title}"`,
            });
            applied.push(result.asset.assetTag);
          }
        } catch (error) {
          // One odd asset (already DISPOSED, already LOST) must not abort the whole
          // closure. Record it and carry on — but say so in the response rather than
          // silently dropping it.
          if (error instanceof IllegalTransitionError) {
            skipped.push({ assetTag: result.asset.assetTag, reason: error.message });
            continue;
          }
          throw error;
        }
      }

      // Any assignment still open is finished by the closure itself.
      await tx.auditAssignment.updateMany({
        where: { cycleId: id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] }, isDeleted: false },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });

      // Discrepancies nobody dealt with are confirmed by the closure, not left OPEN
      // forever — the asset has already been written down as LOST/DAMAGED above.
      await tx.auditDiscrepancy.updateMany({
        where: { cycleId: id, status: 'OPEN', isDeleted: false },
        data: { status: 'CONFIRMED' },
      });

      const closed = await tx.auditCycle.findUnique({ where: { id } });
      return { cycle: closed, applied, skipped };
    });

    return NextResponse.json({
      success: true,
      message: `Audit cycle closed. ${outcome.applied.length} asset record(s) updated.`,
      cycle: outcome.cycle,
      assetsUpdated: outcome.applied,
      assetsSkipped: outcome.skipped,
    });
  } catch (error: any) {
    if (error instanceof AlreadyClosedError) {
      return NextResponse.json(
        { success: false, error: 'This audit cycle was already closed.' },
        { status: 409 }
      );
    }

    console.error('Close audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while closing audit cycle' },
      { status: 500 }
    );
  }
}

/** Lost the race to another close request. */
class AlreadyClosedError extends Error {}
