import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function POST() {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user } = auth;

  try {
    const result = await prisma.notification.updateMany({
      where: {
        recipientUserId: user.id,
        status: 'UNREAD',
        isDeleted: false,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.count,
    });
  } catch (error: any) {
    console.error('POST /api/notifications/read-all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
