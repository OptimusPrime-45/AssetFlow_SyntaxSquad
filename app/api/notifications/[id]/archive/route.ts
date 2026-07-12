import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user } = auth;

  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipientUserId: user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error(`PATCH /api/notifications/${id}/archive error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
