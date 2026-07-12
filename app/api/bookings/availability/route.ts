import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startAtParam = searchParams.get('startAt');
    const endAtParam = searchParams.get('endAt');
    const assetId = searchParams.get('assetId');

    if (!startAtParam || !endAtParam) {
      return NextResponse.json(
        { success: false, error: 'Both startAt and endAt query parameters are required' },
        { status: 400 }
      );
    }

    const startAt = new Date(startAtParam);
    const endAt = new Date(endAtParam);

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date formats provided for startAt or endAt' },
        { status: 400 }
      );
    }

    if (startAt >= endAt) {
      return NextResponse.json(
        { success: false, error: 'startAt date must be strictly before endAt date' },
        { status: 400 }
      );
    }

    if (assetId) {
      // 1. Specific Asset Availability check
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { category: true },
      });

      if (!asset || asset.isDeleted) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }

      // Check if general status is unbookable
      const unbookableStatuses = ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
      if (unbookableStatuses.includes(asset.status)) {
        return NextResponse.json({
          success: true,
          available: false,
          reason: `Asset is in terminal or unbookable status: ${asset.status}`,
          conflict: null,
        });
      }

      // Check if it is marked bookable
      const isBookable = asset.sharedBookable || asset.category.isBookable;
      if (!isBookable) {
        return NextResponse.json({
          success: true,
          available: false,
          reason: 'Asset is not bookable',
          conflict: null,
        });
      }

      // Check for overlapping active bookings
      const conflict = await prisma.resourceBooking.findFirst({
        where: {
          assetId,
          isDeleted: false,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        include: {
          bookedBy: {
            select: {
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
      });

      if (conflict) {
        return NextResponse.json({
          success: true,
          available: false,
          reason: 'Asset is already booked during this time slot',
          conflict: {
            id: conflict.id,
            title: conflict.title,
            startAt: conflict.startAt,
            endAt: conflict.endAt,
            bookedBy: conflict.bookedBy,
          },
        });
      }

      return NextResponse.json({
        success: true,
        available: true,
        reason: 'Asset is available',
        conflict: null,
      });
    } else {
      // 2. Organization-wide Available Assets list
      const assets = await prisma.asset.findMany({
        where: {
          isDeleted: false,
          status: { notIn: ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'] },
          OR: [
            { sharedBookable: true },
            { category: { isBookable: true } },
          ],
          bookings: {
            none: {
              status: { notIn: ['CANCELLED', 'REJECTED'] },
              isDeleted: false,
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          },
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
    }
  } catch (error: any) {
    console.error('Fetch availability error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while checking availability' },
      { status: 500 }
    );
  }
}
