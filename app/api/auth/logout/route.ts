import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, deleteSessionCookie } from '@/lib/auth/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (token) {
      // Invalidate in database
      await destroySession(token);
    }

    // Clear session cookie
    await deleteSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
