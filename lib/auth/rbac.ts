import { verifySession } from './session';
import { UserRole } from '@/app/generated/prisma/enums';

export type AuthSuccess = {
  user: any;
  employee: any;
};

export type AuthFailure = {
  error: string;
  status: number;
};

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Checks if the current request session is valid and optionally if the user has one of the allowed roles.
 * Returns the user and employee on success, or an error and status code on failure.
 */
export async function checkAuth(allowedRoles?: UserRole[]): Promise<AuthResult> {
  try {
    const sessionData = await verifySession();
    if (!sessionData) {
      return { error: 'Unauthorized', status: 401 };
    }

    const { user } = sessionData;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return { error: 'Forbidden: Insufficient permissions', status: 403 };
    }

    return { user, employee: user.employee };
  } catch (error) {
    console.error('RBAC error:', error);
    return { error: 'Internal Server Error', status: 500 };
  }
}
