import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const { user, session: currentSession } = sessionData;

    // Fetch all active, non-expired, non-revoked sessions for the user
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSession.id,
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
    });
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching sessions' },
      { status: 500 }
    );
  }
}
