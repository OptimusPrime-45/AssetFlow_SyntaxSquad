import type { AllocationStatus } from '@/app/generated/prisma/enums';

/**
 * Allocation states in which the asset is still physically in someone's hands.
 *
 * Filtering on ACTIVE alone is a trap: the overdue cron flips exactly the rows a
 * dashboard cares about to OVERDUE, so an ACTIVE-only query drops them the moment
 * they become interesting — the Overdue Returns card would read zero precisely
 * when it should be sounding the alarm. RETURN_PENDING likewise: the holder has
 * asked to give the asset back, but until an Asset Manager approves the return
 * they still have it.
 */
export const HELD_ALLOCATION_STATUSES: AllocationStatus[] = [
    'ACTIVE',
    'OVERDUE',
    'RETURN_PENDING',
];
