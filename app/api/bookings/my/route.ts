import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can fetch their own bookings' },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');
    const startAtParam = searchParams.get('startAt');
    const endAtParam = searchParams.get('endAt');

    const filters: any = {
      isDeleted: false,
      bookedById: auth.employee.id,
    };

    if (status) filters.status = status;
    if (assetId) filters.assetId = assetId;

    if (startAtParam || endAtParam) {
      filters.AND = [];
      if (startAtParam) {
        filters.AND.push({ startAt: { gte: new Date(startAtParam) } });
      }
      if (endAtParam) {
        filters.AND.push({ endAt: { lte: new Date(endAtParam) } });
      }
    }

    const [bookings, totalCount] = await prisma.$transaction([
      prisma.resourceBooking.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          asset: {
            include: {
              category: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          bookedForDepartment: true,
        },
      }),
      prisma.resourceBooking.count({ where: filters }),
    ]);

    return NextResponse.json({
      success: true,
      bookings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch my bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching your bookings' },
      { status: 500 }
    );
  }
}
