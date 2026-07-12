import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession, deleteSessionCookie } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    // Authenticate current user session
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { user, session: currentSession } = sessionData;

    // Await params promise as per Next.js 15/16 rules
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const targetSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!targetSession || targetSession.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Revoke the session by setting revokedAt
    await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    // If revoking the current session, clear the browser cookie too
    const isCurrentSession = targetSession.id === currentSession.id;
    if (isCurrentSession) {
      await deleteSessionCookie();
    }

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
      loggedOut: isCurrentSession,
    });
  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while revoking the session' },
      { status: 500 }
    );
  }
}
