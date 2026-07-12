import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { bookingScopeFilter } from '@/lib/bookings/scope';

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    // Default window: 30 days ago to 30 days from now
    const now = new Date();
    const start = startParam ? new Date(startParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endParam ? new Date(endParam) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const timeFilters = {
      startAt: { lte: end },
      endAt: { gte: start },
    };

    const filters: any = {
      isDeleted: false,
      status: { notIn: ['CANCELLED', 'REJECTED'] },
      ...timeFilters,
    };

    if (assetId) {
      // If filtering for a specific asset, verify asset exists and is bookable
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { category: true },
      });

      if (!asset || asset.isDeleted) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }

      filters.assetId = assetId;
    } else {
      // Otherwise, filter calendar items visible to the current user's role
      const scopeFilter = bookingScopeFilter({
        role: auth.user.role,
        employeeId: auth.employee?.id ?? null,
        departmentId: auth.employee?.departmentId ?? null,
      });

      Object.assign(filters, scopeFilter);
    }

    const bookings = await prisma.resourceBooking.findMany({
      where: filters,
      orderBy: { startAt: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetTag: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        bookedForDepartment: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error: any) {
    console.error('Fetch calendar bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching calendar bookings' },
      { status: 500 }
    );
  }
}
