import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/app/generated/prisma/enums';

type Approver = {
    role: UserRole;
    employeeId: string | null;
    departmentId: string | null;
};

/**
 * May this person decide on this transfer request?
 *
 *   ADMIN / ASSET_MANAGER  any transfer, org-wide
 *   DEPARTMENT_HEAD        only transfers touching their own department — as
 *                          either side of the move, or via the employee on
 *                          either side. Their authority stops at its border.
 *
 * Returns null when allowed, or a reason string when not.
 */
export async function canDecideTransfer(
    approver: Approver,
    transferId: string,
): Promise<string | null> {
    if (approver.role === 'ADMIN' || approver.role === 'ASSET_MANAGER') {
        return null;
    }

    if (approver.role !== 'DEPARTMENT_HEAD') {
        return 'Only an Asset Manager or Department Head can decide on a transfer';
    }

    if (!approver.departmentId) {
        return 'You are not assigned to a department';
    }

    const transfer = await prisma.assetTransferRequest.findUnique({
        where: { id: transferId },
        select: {
            fromDepartmentId: true,
            toDepartmentId: true,
            fromEmployee: { select: { departmentId: true } },
            toEmployee: { select: { departmentId: true } },
        },
    });

    if (!transfer) return 'Transfer request not found';

    const touchesDepartment = [
        transfer.fromDepartmentId,
        transfer.toDepartmentId,
        transfer.fromEmployee?.departmentId,
        transfer.toEmployee?.departmentId,
    ].includes(approver.departmentId);

    return touchesDepartment
        ? null
        : 'You can only decide on transfers involving your own department';
}
