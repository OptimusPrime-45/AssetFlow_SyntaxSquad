import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Find user by email (and ensure they are not deleted)
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Must mirror verifySession, which only honours an ACTIVE account. If login
    // let a non-ACTIVE user in, they'd get a cookie and then 401 on every
    // subsequent request.
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended' },
        { status: 403 }
      );
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Your account is currently inactive' },
        { status: 403 }
      );
    }

    if (user.status === 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { success: false, error: 'Please verify your email address before logging in' },
        { status: 403 }
      );
    }

    // Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session in database
    const { session, token } = await createSession(user.id, request.headers);

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set HTTP-only secure cookie
    await setSessionCookie(token, session.expiresAt);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              employeeCode: user.employee.employeeCode,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}
