import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { maintenanceScopeFilter } from '@/lib/maintenance/scope';
import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

const createMaintenanceSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  issueTitle: z.string().min(1, 'Issue title is required'),
  issueDescription: z.string().min(1, 'Issue description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).default('MEDIUM'),
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
    const priority = searchParams.get('priority');
    const assetId = searchParams.get('assetId');
    const requestedById = searchParams.get('requestedById');
    const assignedTechnicianId = searchParams.get('assignedTechnicianId');

    const filters: any = { isDeleted: false };

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assetId) filters.assetId = assetId;
    if (requestedById) filters.requestedById = requestedById;
    if (assignedTechnicianId) filters.assignedTechnicianId = assignedTechnicianId;

    const where = {
      AND: [
        filters,
        maintenanceScopeFilter({
          role: auth.user.role,
          employeeId: auth.employee?.id ?? null,
          departmentId: auth.employee?.departmentId ?? null,
        }),
      ],
    };

    const [requests, totalCount] = await prisma.$transaction([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              status: true,
              condition: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: true,
            },
          },
          assignedTechnician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch maintenance requests error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching maintenance requests' },
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
      { success: false, error: 'Only employees with an associated profile can submit maintenance requests' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const result = createMaintenanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { assetId, issueTitle, issueDescription, priority } = result.data;

    // Fetch and validate asset status
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const invalidAssetStatuses = ['UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    if (invalidAssetStatuses.includes(asset.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot request maintenance for asset in ${asset.status} status` },
        { status: 400 }
      );
    }

    // Create the request and log the initial history event in a single transaction
    const newRequest = await prisma.$transaction(async (tx) => {
      const maintenanceRequest = await tx.maintenanceRequest.create({
        data: {
          assetId,
          requestedById: auth.employee.id,
          issueTitle,
          issueDescription,
          priority,
          status: 'PENDING',
        },
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: maintenanceRequest.id,
          event: 'REQUESTED',
          actorId: auth.employee.id,
          newStatus: 'PENDING',
          note: 'Maintenance request created',
        },
      });

      return maintenanceRequest;
    });

    return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Create maintenance request error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while submitting maintenance request' },
      { status: 500 }
    );
  }
}
