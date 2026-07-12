import type { UserRole } from '@/app/generated/prisma/enums';

type Viewer = {
    role: UserRole;
    employeeId: string | null;
    departmentId: string | null;
};

/**
 * The slice of the asset directory a given role is allowed to see.
 *
 *   ADMIN / ASSET_MANAGER  every asset
 *   DEPARTMENT_HEAD        assets owned by, or allocated to, their department
 *   EMPLOYEE               only assets currently allocated to them
 *
 * Returned as a Prisma `where` fragment so it can be AND-ed onto any query. A
 * user with no employee profile sees nothing rather than everything — failing
 * closed matters more than a helpful error here.
 */
export function assetScopeFilter(viewer: Viewer): Record<string, unknown> {
    if (viewer.role === 'ADMIN' || viewer.role === 'ASSET_MANAGER') {
        return {};
    }

    if (!viewer.employeeId) {
        return { id: '__none__' };
    }

    if (viewer.role === 'DEPARTMENT_HEAD') {
        if (!viewer.departmentId) return { id: '__none__' };

        return {
            OR: [
                { departmentId: viewer.departmentId },
                {
                    allocations: {
                        some: {
                            isCurrent: true,
                            isDeleted: false,
                            OR: [
                                { allocatedToDepartmentId: viewer.departmentId },
                                { allocatedToEmployee: { departmentId: viewer.departmentId } },
                            ],
                        },
                    },
                },
            ],
        };
    }

    // EMPLOYEE
    return {
        allocations: {
            some: {
                isCurrent: true,
                isDeleted: false,
                allocatedToEmployeeId: viewer.employeeId,
            },
        },
    };
}

/** True when this role may see every asset, bookable or not. */
export function canSeeAllAssets(role: UserRole): boolean {
    return role === 'ADMIN' || role === 'ASSET_MANAGER';
}
