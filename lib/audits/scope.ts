import type { UserRole } from '@/app/generated/prisma/enums';

type Viewer = {
  role: UserRole;
  employeeId: string | null;
  departmentId: string | null;
};

/**
 * Scopes the audit cycles query based on the viewer's role:
 * - ADMIN / ASSET_MANAGER: sees all audit cycles org-wide.
 * - DEPARTMENT_HEAD: sees cycles associated with their department, or cycles where they
 *   themselves are assigned as an auditor.
 * - EMPLOYEE: sees only cycles where they are assigned as an auditor.
 *
 * Returns a Prisma `where` fragment.
 */
export function auditScopeFilter(viewer: Viewer): Record<string, any> {
  if (viewer.role === 'ADMIN' || viewer.role === 'ASSET_MANAGER') {
    return {};
  }

  if (!viewer.employeeId) {
    return { id: '__none__' };
  }

  if (viewer.role === 'DEPARTMENT_HEAD') {
    if (!viewer.departmentId) {
      return {
        assignments: {
          some: {
            auditorId: viewer.employeeId,
            isDeleted: false,
          },
        },
      };
    }

    return {
      OR: [
        { departmentId: viewer.departmentId },
        {
          assignments: {
            some: {
              auditorId: viewer.employeeId,
              isDeleted: false,
            },
          },
        },
      ],
    };
  }

  // EMPLOYEE
  return {
    assignments: {
      some: {
        auditorId: viewer.employeeId,
        isDeleted: false,
      },
    },
  };
}
