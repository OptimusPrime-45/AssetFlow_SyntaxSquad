import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const TransferRequestStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]);

const createTransferSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  toEmployeeId: z.string().nullable().optional(),
  toDepartmentId: z.string().nullable().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

function getTransferScopeFilter(auth: { user: any; employee: any }) {
  const { user, employee } = auth;
  
  if (user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') {
    return {};
  }
  
  if (!employee) {
    return { id: '__none__' };
  }
  
  if (user.role === 'DEPARTMENT_HEAD') {
    if (!employee.departmentId) return { id: '__none__' };
    
    return {
      OR: [
        { fromDepartmentId: employee.departmentId },
        { toDepartmentId: employee.departmentId },
        { fromEmployee: { departmentId: employee.departmentId } },
        { toEmployee: { departmentId: employee.departmentId } },
      ],
    };
  }
  
  // EMPLOYEE
  return {
    OR: [
      { requestedById: employee.id },
      { fromEmployeeId: employee.id },
      { toEmployeeId: employee.id },
    ],
  };
}

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');
    const requestedById = searchParams.get('requestedById');

    const where: any = {
      isDeleted: false,
      ...getTransferScopeFilter(auth),
    };

    if (status) where.status = status;
    if (assetId) where.assetId = assetId;
    if (requestedById) {
      if (where.requestedById && where.requestedById !== requestedById) {
        return NextResponse.json({ success: true, transfers: [], pagination: { page, limit, totalCount: 0, totalPages: 0 } });
      }
      where.requestedById = requestedById;
    }

    const [transfers, totalCount] = await prisma.$transaction([
      prisma.assetTransferRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: true,
          requestedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          fromEmployee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          fromDepartment: true,
          toEmployee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          toDepartment: true,
          reviewedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.assetTransferRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      transfers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Fetch transfers error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching transfers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { employee } = auth;
  if (!employee) {
    return NextResponse.json(
      { success: false, error: 'User must have an Employee profile to request transfers' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const result = createTransferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { assetId, toEmployeeId, toDepartmentId, reason } = result.data;

    // Verify recipient options: either employee or department, not both or neither
    const hasEmployee = !!toEmployeeId;
    const hasDepartment = !!toDepartmentId;
    if ((hasEmployee && hasDepartment) || (!hasEmployee && !hasDepartment)) {
      return NextResponse.json(
        { success: false, error: 'Transfer must target either a new employee or department, but not both' },
        { status: 400 }
      );
    }

    // Verify Asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Verify recipient employee exists
    if (toEmployeeId) {
      const recipientEmp = await prisma.employee.findUnique({
        where: { id: toEmployeeId },
      });
      if (!recipientEmp || recipientEmp.isDeleted) {
        return NextResponse.json({ success: false, error: 'Recipient employee not found' }, { status: 400 });
      }
    }

    // Verify recipient department exists
    if (toDepartmentId) {
      const recipientDept = await prisma.department.findUnique({
        where: { id: toDepartmentId },
      });
      if (!recipientDept || recipientDept.isDeleted) {
        return NextResponse.json({ success: false, error: 'Recipient department not found' }, { status: 400 });
      }
    }

    // Check if asset has active allocation
    const currentAllocation = await prisma.assetAllocation.findFirst({
      where: { assetId, isCurrent: true, isDeleted: false, status: 'ACTIVE' },
    });

    if (!currentAllocation) {
      return NextResponse.json(
        { success: false, error: 'Asset is not currently allocated and cannot be transferred' },
        { status: 400 }
      );
    }

    // Check if there is already a pending transfer request for this asset
    const pendingTransfer = await prisma.assetTransferRequest.findFirst({
      where: { assetId, status: 'PENDING', isDeleted: false },
    });

    if (pendingTransfer) {
      return NextResponse.json(
        { success: false, error: 'There is already a pending transfer request for this asset' },
        { status: 409 }
      );
    }

    // Create transfer request in database transaction
    const newTransfer = await prisma.$transaction(async (tx) => {
      // 1. Create Transfer Request
      const transfer = await tx.assetTransferRequest.create({
        data: {
          assetId,
          currentAllocationId: currentAllocation.id,
          requestedById: employee.id,
          fromEmployeeId: currentAllocation.allocatedToEmployeeId,
          fromDepartmentId: currentAllocation.allocatedToDepartmentId,
          toEmployeeId: toEmployeeId || null,
          toDepartmentId: toDepartmentId || null,
          status: 'PENDING',
          reason,
        },
      });

      // 2. Set Allocation status to TRANSFER_PENDING
      await tx.assetAllocation.update({
        where: { id: currentAllocation.id },
        data: { status: 'TRANSFER_PENDING' },
      });

      // 3. Log history on the allocation
      await tx.allocationHistory.create({
        data: {
          allocationId: currentAllocation.id,
          event: 'TRANSFER_REQUESTED',
          actorId: employee.id,
          previousStatus: 'ACTIVE',
          newStatus: 'TRANSFER_PENDING',
          note: `Transfer requested by ${employee.firstName} ${employee.lastName}. Reason: ${reason}`,
        },
      });

      return transfer;
    });

    const fullTransfer = await prisma.assetTransferRequest.findUnique({
      where: { id: newTransfer.id },
      include: {
        asset: true,
        requestedBy: true,
        fromEmployee: true,
        fromDepartment: true,
        toEmployee: true,
        toDepartment: true,
      },
    });

    return NextResponse.json({ success: true, transfer: fullTransfer }, { status: 201 });
  } catch (error: any) {
    console.error('Request transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while requesting transfer' },
      { status: 500 }
    );
  }
}
