import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    // Bookable assets are deliberately NOT filtered to status AVAILABLE. A meeting
    // room booked 09:00-10:00 is RESERVED, but it's still bookable for 14:00 —
    // bookability is about time slots, which the booking module resolves. Here we
    // only exclude assets that can't be booked for *any* slot.
    //
    // This listing is not role-scoped: shared resources are org-wide by nature,
    // and every role may book them.
    const assets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        status: { notIn: ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'] },
        OR: [
          { sharedBookable: true },
          { category: { isBookable: true } },
        ],
      },
      include: {
        category: true,
        department: true,
        qrCode: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      assets,
    });
  } catch (error: any) {
    console.error('Fetch bookable assets error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
