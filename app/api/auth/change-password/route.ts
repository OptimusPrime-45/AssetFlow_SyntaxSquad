import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(request: Request) {
  try {
    // Authenticate user
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { user, session } = sessionData;

    // Parse input
    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Check if passwords are the same
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Authentication configuration mismatch' },
        { status: 500 }
      );
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password and revoke other active sessions for security
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.session.updateMany({
        where: {
          userId: user.id,
          tokenHash: { not: session.tokenHash },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. Other active sessions have been logged out.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during password change' },
      { status: 500 }
    );
  }
}
