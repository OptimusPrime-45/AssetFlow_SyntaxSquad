import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyVerificationToken } from '@/lib/auth/tokens';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifyEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token } = result.data;

    // Verify token
    const userId = verifyVerificationToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status === 'ACTIVE' && user.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        message: 'Email has already been verified.',
      });
    }

    // Update user status and emailVerifiedAt timestamp
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during email verification' },
      { status: 500 }
    );
  }
}
