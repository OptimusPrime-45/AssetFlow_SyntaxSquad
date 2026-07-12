import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user } = auth;

  try {
    const count = await prisma.notification.count({
      where: {
        recipientUserId: user.id,
        status: 'UNREAD',
        isDeleted: false,
      },
    });

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('GET /api/notifications/unread-count error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
