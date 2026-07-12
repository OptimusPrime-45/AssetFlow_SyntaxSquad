import type { UserRole } from '@/app/generated/prisma/enums';

type Viewer = {
  role: UserRole;
  employeeId: string | null;
  departmentId: string | null;
};

/**
 * Scopes the maintenance requests query based on the viewer's role:
 * - ADMIN / ASSET_MANAGER: sees all requests org-wide.
 * - DEPARTMENT_HEAD: sees requests on assets belonging to their department, or
 *   requests created by employees in their department.
 * - EMPLOYEE: sees requests they created or requests assigned to them as a technician.
 *
 * Returns a Prisma `where` fragment.
 */
export function maintenanceScopeFilter(viewer: Viewer): Record<string, any> {
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
        { asset: { departmentId: viewer.departmentId } },
        { requestedBy: { departmentId: viewer.departmentId } },
      ],
    };
  }

  // EMPLOYEE
  return {
    OR: [
      { requestedById: viewer.employeeId },
      { assignedTechnicianId: viewer.employeeId },
    ],
  };
}
