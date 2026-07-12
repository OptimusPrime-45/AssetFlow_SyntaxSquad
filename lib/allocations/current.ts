import { prisma } from '@/lib/prisma';
import type { Tx } from '@/lib/tx';

type Client = Tx | typeof prisma;

const holderInclude = {
    allocatedToEmployee: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
    },
    allocatedToDepartment: { select: { id: true, name: true, code: true } },
} as const;

/**
 * The allocation that currently holds this asset, or null if it's free.
 *
 * Always read this at the moment you act on it, never from a value captured
 * earlier — a transfer request created last week may name an allocation that has
 * since been returned and replaced.
 */
export async function currentAllocation(client: Client, assetId: string) {
    return client.assetAllocation.findFirst({
        where: { assetId, isCurrent: true, isDeleted: false },
        include: holderInclude,
    });
}

type WithHolder = {
    allocatedToEmployee: { firstName: string; lastName: string } | null;
    allocatedToDepartment: { name: string } | null;
};

/** "Priya Sharma" or "Engineering" — whoever the asset is currently with. */
export function holderName(allocation: WithHolder): string {
    if (allocation.allocatedToEmployee) {
        return `${allocation.allocatedToEmployee.firstName} ${allocation.allocatedToEmployee.lastName}`;
    }
    return allocation.allocatedToDepartment?.name ?? 'another holder';
}
