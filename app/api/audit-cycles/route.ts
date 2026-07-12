import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { auditScopeFilter } from '@/lib/audits/scope';
import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

const createAuditCycleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  scopeType: z.enum(['DEPARTMENT', 'LOCATION', 'CUSTOM'] as const).default('DEPARTMENT'),
  departmentId: z.string().nullable().optional(),
  locationFilter: z.string().nullable().optional(),
  startDate: z.string().min(1, 'Start date is required').transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid start date format' });
      return z.NEVER;
    }
    return date;
  }),
  endDate: z.string().min(1, 'End date is required').transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid end date format' });
      return z.NEVER;
    }
    return date;
  }),
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
    const scopeType = searchParams.get('scopeType');

    const filters: any = { isDeleted: false };

    if (status) filters.status = status;
    if (scopeType) filters.scopeType = scopeType;

    const where = {
      AND: [
        filters,
        auditScopeFilter({
          role: auth.user.role,
          employeeId: auth.employee?.id ?? null,
          departmentId: auth.employee?.departmentId ?? null,
        }),
      ],
    };

    const [cycles, totalCount] = await prisma.$transaction([
      prisma.auditCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              assignments: { where: { isDeleted: false } },
              results: { where: { isDeleted: false } },
              discrepancies: { where: { isDeleted: false } },
            },
          },
        },
      }),
      prisma.auditCycle.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      cycles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch audit cycles error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching audit cycles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can create audit cycles' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const result = createAuditCycleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      scopeType,
      departmentId,
      locationFilter,
      startDate,
      endDate,
    } = result.data;

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Audit cycle start date must be strictly before end date' },
        { status: 400 }
      );
    }

    // Verify department if DEPARTMENT scope
    if (scopeType === 'DEPARTMENT') {
      if (!departmentId) {
        return NextResponse.json(
          { success: false, error: 'Department ID is required when scope type is DEPARTMENT' },
          { status: 400 }
        );
      }
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department || department.isDeleted) {
        return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
      }
    }

    // Verify locationFilter if LOCATION scope
    if (scopeType === 'LOCATION' && !locationFilter) {
      return NextResponse.json(
        { success: false, error: 'Location filter is required when scope type is LOCATION' },
        { status: 400 }
      );
    }

    const newCycle = await prisma.auditCycle.create({
      data: {
        title,
        description,
        scopeType,
        departmentId: scopeType === 'DEPARTMENT' ? departmentId : null,
        locationFilter: scopeType === 'LOCATION' ? locationFilter : null,
        startDate,
        endDate,
        createdById: auth.employee.id,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ success: true, cycle: newCycle }, { status: 201 });
  } catch (error: any) {
    console.error('Create audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating audit cycle' },
      { status: 500 }
    );
  }
}
