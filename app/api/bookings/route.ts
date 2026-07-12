import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { bookingScopeFilter } from '@/lib/bookings/scope';
import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

const createBookingSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  title: z.string().min(1, 'Title is required'),
  purpose: z.enum(['ROOM', 'VEHICLE', 'EQUIPMENT', 'SPACE', 'OTHER'] as const).default('OTHER'),
  audience: z.enum(['INDIVIDUAL', 'DEPARTMENT'] as const).default('INDIVIDUAL'),
  startAt: z.string().min(1, 'Start date is required').transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid start date format',
      });
      return z.NEVER;
    }
    return date;
  }),
  endAt: z.string().min(1, 'End date is required').transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid end date format',
      });
      return z.NEVER;
    }
    return date;
  }),
  bookedForDepartmentId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  locationNote: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');
    const bookedById = searchParams.get('bookedById');
    const startAtParam = searchParams.get('startAt');
    const endAtParam = searchParams.get('endAt');

    const filters: any = { isDeleted: false };

    if (status) filters.status = status;
    if (assetId) filters.assetId = assetId;
    if (bookedById) filters.bookedById = bookedById;

    if (startAtParam || endAtParam) {
      filters.AND = filters.AND || [];
      if (startAtParam) {
        filters.AND.push({ startAt: { gte: new Date(startAtParam) } });
      }
      if (endAtParam) {
        filters.AND.push({ endAt: { lte: new Date(endAtParam) } });
      }
    }

    const where = {
      AND: [
        filters,
        bookingScopeFilter({
          role: auth.user.role,
          employeeId: auth.employee?.id ?? null,
          departmentId: auth.employee?.departmentId ?? null,
        }),
      ],
    };

    const [bookings, totalCount] = await prisma.$transaction([
      prisma.resourceBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          asset: {
            include: {
              category: true,
              department: true,
            },
          },
          bookedBy: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
          bookedForDepartment: true,
        },
      }),
      prisma.resourceBooking.count({ where }),
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
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can create bookings' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const result = createBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      assetId,
      title,
      purpose,
      audience,
      startAt,
      endAt,
      bookedForDepartmentId,
      notes,
      locationNote,
    } = result.data;

    // 1. Basic date logical validation
    const now = new Date();
    if (startAt < now) {
      return NextResponse.json(
        { success: false, error: 'Booking start time must be in the future' },
        { status: 400 }
      );
    }
    if (startAt >= endAt) {
      return NextResponse.json(
        { success: false, error: 'Booking start time must be before end time' },
        { status: 400 }
      );
    }

    // 2. Fetch asset and check suitability
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { category: true },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Bookable validation: must not be in excluded states
    const unbookableStatuses = ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    if (unbookableStatuses.includes(asset.status)) {
      return NextResponse.json(
        { success: false, error: `Asset is currently in ${asset.status} status and cannot be booked` },
        { status: 400 }
      );
    }

    // Category or asset sharedBookable flag must permit booking
    const isBookable = asset.sharedBookable || asset.category.isBookable;
    if (!isBookable) {
      return NextResponse.json(
        { success: false, error: 'This asset is not configured to be bookable' },
        { status: 400 }
      );
    }

    // 3. Overlap check
    // An active booking is one whose status is NOT Cancelled or Rejected, and is not deleted
    const overlappingBooking = await prisma.resourceBooking.findFirst({
      where: {
        assetId,
        isDeleted: false,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlappingBooking) {
      return NextResponse.json(
        {
          success: false,
          error: 'This resource is already booked for the requested time slot',
          overlap: {
            id: overlappingBooking.id,
            startAt: overlappingBooking.startAt,
            endAt: overlappingBooking.endAt,
          },
        },
        { status: 409 }
      );
    }

    // 4. Determine status: ADMIN and ASSET_MANAGER auto-approves
    const isApprover = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    const status = isApprover ? 'UPCOMING' : 'PENDING';

    const booking = await prisma.resourceBooking.create({
      data: {
        assetId,
        bookedById: auth.employee.id,
        bookedForDepartmentId: audience === 'DEPARTMENT' ? (bookedForDepartmentId || auth.employee.departmentId) : null,
        title,
        purpose,
        audience,
        status,
        startAt,
        endAt,
        notes,
        locationNote,
        approvedById: isApprover ? auth.employee.id : null,
        approvedAt: isApprover ? new Date() : null,
      },
      include: {
        asset: true,
        bookedBy: true,
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error: any) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating booking' },
      { status: 500 }
    );
  }
}
