import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const ReturnStatusEnum = z.enum([
  'PENDING_INSPECTION',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
]);

const AssetConditionEnum = z.enum([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);

const createReturnSchema = z.object({
  assetAllocationId: z.string().min(1, 'Asset Allocation ID is required'),
  conditionOnReturn: AssetConditionEnum.optional(),
  conditionNotes: z.string().nullable().optional(),
});

function getReturnScopeFilter(auth: { user: any; employee: any }) {
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
        { assetAllocation: { allocatedToDepartmentId: employee.departmentId } },
        { assetAllocation: { allocatedToEmployee: { departmentId: employee.departmentId } } },
      ],
    };
  }
  
  // EMPLOYEE
  return {
    OR: [
      { returnedById: employee.id },
      { assetAllocation: { allocatedToEmployeeId: employee.id } },
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
    const assetAllocationId = searchParams.get('assetAllocationId');

    const where: any = {
      isDeleted: false,
      ...getReturnScopeFilter(auth),
    };

    if (status) where.status = status;
    if (assetAllocationId) where.assetAllocationId = assetAllocationId;

    const [returns, totalCount] = await prisma.$transaction([
      prisma.assetReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assetAllocation: {
            include: {
              asset: true,
              allocatedToEmployee: {
                select: { id: true, employeeCode: true, firstName: true, lastName: true },
              },
              allocatedToDepartment: true,
            },
          },
          returnedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          receivedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.assetReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Fetch returns error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching return requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user, employee } = auth;
  if (!employee) {
    return NextResponse.json(
      { success: false, error: 'User must have an Employee profile to request returns' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const result = createReturnSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { assetAllocationId, conditionOnReturn, conditionNotes } = result.data;

    // Verify Allocation exists and is active (Current + active status)
    const allocation = await prisma.assetAllocation.findUnique({
      where: { id: assetAllocationId },
    });

    if (!allocation || allocation.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset allocation not found' }, { status: 404 });
    }

    if (!allocation.isCurrent || (allocation.status !== 'ACTIVE' && allocation.status !== 'OVERDUE')) {
      return NextResponse.json(
        { success: false, error: `Only active or overdue current allocations can be returned. Current status: ${allocation.status}` },
        { status: 400 }
      );
    }

    // Verify permission: Employees can only return their own allocations
    const isManager = user.role === 'ADMIN' || user.role === 'ASSET_MANAGER';
    if (!isManager && allocation.allocatedToEmployeeId !== employee.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only request returns for your own allocated assets' },
        { status: 403 }
      );
    }

    // Check if there is already a return request for this allocation
    const existingReturn = await prisma.assetReturn.findFirst({
      where: { assetAllocationId, isDeleted: false },
    });

    if (existingReturn) {
      return NextResponse.json(
        { success: false, error: 'A return request already exists for this allocation' },
        { status: 409 }
      );
    }

    // Create Return request in transaction
    const newReturn = await prisma.$transaction(async (tx) => {
      // 1. Create return request
      const returnRequest = await tx.assetReturn.create({
        data: {
          assetAllocationId,
          returnedById: allocation.allocatedToEmployeeId || employee.id,
          status: 'PENDING_INSPECTION',
          conditionOnReturn: conditionOnReturn || null,
          conditionNotes: conditionNotes || null,
        },
      });

      // 2. Set Allocation status to RETURN_PENDING
      await tx.assetAllocation.update({
        where: { id: assetAllocationId },
        data: { status: 'RETURN_PENDING' },
      });

      // 3. Log history entry
      await tx.allocationHistory.create({
        data: {
          allocationId: assetAllocationId,
          event: 'RETURN_REQUESTED',
          actorId: employee.id,
          previousStatus: allocation.status,
          newStatus: 'RETURN_PENDING',
          note: conditionNotes || 'Asset return requested and pending inspection',
        },
      });

      return returnRequest;
    });

    const fullReturn = await prisma.assetReturn.findUnique({
      where: { id: newReturn.id },
      include: {
        assetAllocation: {
          include: { asset: true },
        },
        returnedBy: true,
      },
    });

    return NextResponse.json({ success: true, returnRequest: fullReturn }, { status: 201 });
  } catch (error: any) {
    console.error('Request return error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while requesting return' },
      { status: 500 }
    );
  }
}
