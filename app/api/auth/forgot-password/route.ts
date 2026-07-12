import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent user enumeration, return success even if user doesn't exist
    if (!user || user.isDeleted) {
      return NextResponse.json({
        success: true,
        message: 'If a matching account exists, a password reset link has been sent to your email.',
      });
    }

    // Generate random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Save token in the database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Log verification URL (mocking email send)
    console.log('\n=========================================');
    console.log(`Password Reset Link: http://localhost:3000/api/auth/reset-password?token=${rawToken}`);
    console.log('=========================================\n');

    const responsePayload: any = {
      success: true,
      message: 'If a matching account exists, a password reset link has been sent to your email.',
    };

    // Return token in dev for easier API testing
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.resetToken = rawToken;
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
