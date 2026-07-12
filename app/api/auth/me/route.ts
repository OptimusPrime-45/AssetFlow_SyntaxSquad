import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function GET() {
  try {
    const sessionData = await verifySession();

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { user } = sessionData;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              employeeCode: user.employee.employeeCode,
              phone: user.employee.phone,
              avatarUrl: user.employee.avatarUrl,
              designation: user.employee.designation,
              status: user.employee.status,
              departmentId: user.employee.departmentId,
              joinedAt: user.employee.joinedAt,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
