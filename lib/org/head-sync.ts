import type { Tx } from '@/lib/tx';

export type { Tx };

/**
 * Roles that outrank DEPARTMENT_HEAD. Head-of-department bookkeeping must never
 * write over one of these — losing an Admin because they stopped heading a
 * department would be worse than the inconsistency we're fixing.
 */
const SENIOR_ROLES = ['ADMIN', 'ASSET_MANAGER'] as const;

function isSenior(role: string): boolean {
    return (SENIOR_ROLES as readonly string[]).includes(role);
}

/**
 * Demotes an employee back to EMPLOYEE once they no longer head any department.
 * No-op if they still head one, or if they hold a senior role.
 */
async function demoteIfNoLongerHead(tx: Tx, employeeId: string): Promise<void> {
    const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true, user: { select: { role: true } } },
    });

    if (!employee || isSenior(employee.user.role)) return;

    const stillHeads = await tx.department.count({
        where: { headEmployeeId: employeeId, isDeleted: false },
    });

    if (stillHeads === 0) {
        await tx.user.update({
            where: { id: employee.userId },
            data: { role: 'EMPLOYEE' },
        });
    }
}

/**
 * Called when a department's head changes. Grants DEPARTMENT_HEAD to the
 * incoming head and takes it back from the outgoing one, so the role and the
 * headEmployeeId column can never disagree.
 */
export async function syncRolesForNewHead(
    tx: Tx,
    opts: { previousHeadId: string | null; newHeadId: string | null },
): Promise<void> {
    const { previousHeadId, newHeadId } = opts;
    if (previousHeadId === newHeadId) return;

    if (newHeadId) {
        const incoming = await tx.employee.findUnique({
            where: { id: newHeadId },
            select: { userId: true, user: { select: { role: true } } },
        });

        // Don't downgrade an Admin/Asset Manager who also heads a department.
        if (incoming && !isSenior(incoming.user.role)) {
            await tx.user.update({
                where: { id: incoming.userId },
                data: { role: 'DEPARTMENT_HEAD' },
            });
        }
    }

    if (previousHeadId) {
        await demoteIfNoLongerHead(tx, previousHeadId);
    }
}

/**
 * Called when an employee's role changes. Promotion to DEPARTMENT_HEAD installs
 * them as head of their own department; moving off DEPARTMENT_HEAD vacates every
 * department they headed, so no department is left pointing at a non-head.
 */
export async function syncHeadForNewRole(
    tx: Tx,
    opts: { employeeId: string; departmentId: string | null; newRole: string },
): Promise<void> {
    const { employeeId, departmentId, newRole } = opts;

    if (newRole === 'DEPARTMENT_HEAD') {
        if (!departmentId) return; // caller rejects this case before we get here

        const department = await tx.department.findUnique({
            where: { id: departmentId },
            select: { headEmployeeId: true },
        });

        const outgoingHeadId = department?.headEmployeeId ?? null;
        if (outgoingHeadId === employeeId) return;

        await tx.department.update({
            where: { id: departmentId },
            data: { headEmployeeId: employeeId },
        });

        if (outgoingHeadId) {
            await demoteIfNoLongerHead(tx, outgoingHeadId);
        }
        return;
    }

    // Moving to any other role: vacate every department this employee headed.
    await tx.department.updateMany({
        where: { headEmployeeId: employeeId },
        data: { headEmployeeId: null },
    });
}
