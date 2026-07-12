import type { UserRole } from '@/app/generated/prisma/enums';

type Viewer = {
  role: UserRole;
  employeeId: string | null;
  departmentId: string | null;
};

/**
 * Scopes the bookings query based on the viewer's role:
 * - ADMIN / ASSET_MANAGER: sees all bookings org-wide.
 * - DEPARTMENT_HEAD: sees bookings for their department, bookings created by employees
 *   in their department, or bookings on assets belonging to their department.
 * - EMPLOYEE: sees only bookings they created.
 *
 * Returns a Prisma `where` fragment.
 */
export function bookingScopeFilter(viewer: Viewer): Record<string, any> {
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
        { bookedForDepartmentId: viewer.departmentId },
        { bookedBy: { departmentId: viewer.departmentId } },
        { asset: { departmentId: viewer.departmentId } },
      ],
    };
  }

  // EMPLOYEE
  return {
    bookedById: viewer.employeeId,
  };
}
