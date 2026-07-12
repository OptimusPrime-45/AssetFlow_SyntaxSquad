import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can view their assignments' },
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

    const filters: any = {
      isDeleted: false,
      auditorId: auth.employee.id,
    };

    if (status) {
      filters.status = status;
    }

    const [assignments, totalCount] = await prisma.$transaction([
      prisma.auditAssignment.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { cycle: { startDate: 'asc' } },
        include: {
          cycle: {
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
              status: true,
              scopeType: true,
              department: { select: { name: true } },
              locationFilter: true,
            },
          },
          assignedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditAssignment.count({ where: filters }),
    ]);

    return NextResponse.json({
      success: true,
      assignments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch my assignments error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching your assignments' },
      { status: 500 }
    );
  }
}
