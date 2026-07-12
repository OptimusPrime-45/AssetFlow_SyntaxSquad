import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user } = auth;
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const where: any = {
    recipientUserId: user.id,
    isDeleted: false,
  };

  if (statusParam === 'UNREAD' || statusParam === 'READ' || statusParam === 'ARCHIVED') {
    where.status = statusParam;
  } else {
    // Default: return UNREAD and READ (exclude ARCHIVED)
    where.status = { in: ['UNREAD', 'READ'] };
  }

  try {
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
