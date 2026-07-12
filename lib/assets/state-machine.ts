import type { Tx } from '@/lib/tx';
import { currentAllocation, holderName } from '@/lib/allocations/current';
import type {
    AssetStatus,
    AssetCondition,
    AssetStatusChangeReason,
} from '@/app/generated/prisma/enums';

/**
 * The asset lifecycle. A status may only move to one of the statuses listed
 * against it — every other move is rejected.
 *
 * Read it as: from AVAILABLE you can allocate, reserve, send for repair, or
 * write it off; from DISPOSED you can do nothing, because the asset is gone.
 *
 * This is the single source of truth. Allocation, maintenance, and audit all
 * route their status changes through applyStatusChange() below rather than
 * writing asset.status directly, so no module can invent an illegal move.
 */
export const ASSET_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
    AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'],

    // A held asset can be returned, break, or go missing — but it cannot be
    // retired or disposed of while someone still has it. It must come back first.
    ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],

    // Reserved by a booking: hand it over, release the reservation, or it breaks.
    RESERVED: ['ALLOCATED', 'AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],

    // Repair finished (back to the shelf or to its holder), or it turned out to
    // be beyond repair.
    UNDER_MAINTENANCE: ['AVAILABLE', 'ALLOCATED', 'RETIRED', 'LOST'],

    // A lost asset can turn up again, or eventually be written off.
    LOST: ['AVAILABLE', 'RETIRED', 'DISPOSED'],

    // End of service life. The only way out is disposal.
    RETIRED: ['DISPOSED'],

    // Terminal. The asset physically no longer exists.
    DISPOSED: [],
};

/**
 * Reasons an Asset Manager may give when driving a status change by hand.
 * The workflow-owned reasons (ALLOCATION, MAINTENANCE_APPROVAL, AUDIT_*, ...)
 * are deliberately excluded: those are written by their own modules, and letting
 * a manual edit claim one would make the audit trail lie about what happened.
 */
export const MANUAL_REASONS: readonly AssetStatusChangeReason[] = [
    'MANUAL_UPDATE',
    'RETIREMENT',
    'DISPOSAL',
    'LOSS',
];

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
    return ASSET_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: AssetStatus): readonly AssetStatus[] {
    return ASSET_TRANSITIONS[from];
}

/**
 * Thrown when an asset is sent back to AVAILABLE while someone still holds it.
 *
 * This is what keeps `status = ALLOCATED` and "has a current allocation" from
 * drifting apart. Without it, an Asset Manager could flip a held asset to
 * AVAILABLE, leaving the allocation row live — and the next allocation would
 * quietly evict the holder instead of offering a transfer.
 *
 * The legitimate ways out of custody (return approval, revoke) close the
 * allocation first, so they pass this check.
 */
export class ActiveAllocationError extends Error {
    constructor(readonly holder: string, readonly allocationId: string) {
        super(
            `Asset is still held by ${holder}. Process the return or revoke the allocation instead of changing the status directly.`,
        );
        this.name = 'ActiveAllocationError';
    }
}

export class IllegalTransitionError extends Error {
    constructor(
        readonly from: AssetStatus,
        readonly to: AssetStatus,
    ) {
        super(
            from === to
                ? `Asset is already ${from}`
                : `Cannot move an asset from ${from} to ${to}`,
        );
        this.name = 'IllegalTransitionError';
    }

    get allowed(): readonly AssetStatus[] {
        return ASSET_TRANSITIONS[this.from];
    }
}

type StatusChange = {
    assetId: string;
    to: AssetStatus;
    reason: AssetStatusChangeReason;
    /** Employee who caused the change; null for system-driven changes. */
    changedById?: string | null;
    condition?: AssetCondition;
    note?: string | null;
};

/**
 * Moves an asset to a new status, enforcing the transition table and recording
 * the move in AssetStatusHistory. Throws IllegalTransitionError if the move
 * isn't allowed — callers turn that into a 409.
 *
 * Must be called inside a transaction: the status write and the history row have
 * to land together, or the timeline ends up with gaps.
 */
export async function applyStatusChange(tx: Tx, change: StatusChange) {
    const { assetId, to, reason, changedById = null, condition, note = null } = change;

    const asset = await tx.asset.findUnique({
        where: { id: assetId },
        select: { id: true, status: true, condition: true, isDeleted: true },
    });

    if (!asset || asset.isDeleted) {
        throw new Error(`Asset ${assetId} not found`);
    }

    const from = asset.status;
    if (!canTransition(from, to)) {
        throw new IllegalTransitionError(from, to);
    }

    // Returning an asset to the shelf while someone still holds it would leave a
    // live allocation pointing at an AVAILABLE asset — the exact drift that lets
    // a later allocation silently steal it. Callers that legitimately end custody
    // (return approval, revoke, transfer completion) close the allocation first,
    // so they never trip this.
    if (to === 'AVAILABLE') {
        const held = await currentAllocation(tx, assetId);
        if (held) {
            throw new ActiveAllocationError(holderName(held), held.id);
        }
    }

    const toCondition = condition ?? asset.condition;

    const updated = await tx.asset.update({
        where: { id: assetId },
        data: {
            status: to,
            condition: toCondition,
            // Stamp the terminal timestamps as the asset reaches each state.
            ...(to === 'RETIRED' ? { retiredAt: new Date() } : {}),
            ...(to === 'LOST' ? { lostAt: new Date() } : {}),
            ...(to === 'DISPOSED' ? { disposedAt: new Date() } : {}),
        },
    });

    await tx.assetStatusHistory.create({
        data: {
            assetId,
            fromStatus: from,
            toStatus: to,
            fromCondition: asset.condition,
            toCondition,
            reason,
            note,
            changedById,
        },
    });

    return updated;
}
