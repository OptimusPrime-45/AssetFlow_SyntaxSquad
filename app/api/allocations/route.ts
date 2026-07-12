import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { applyStatusChange, IllegalTransitionError } from '@/lib/assets/state-machine';
import { currentAllocation, holderName } from '@/lib/allocations/current';
import { z } from 'zod';

const MAX_PAGE_SIZE = 100;

/** Raised when a concurrent request allocated the asset first. */
class AllocationConflictError extends Error {
  constructor(readonly heldBy: string, readonly allocationId: string) {
    super(`Currently held by ${heldBy}`);
  }
}

const AllocationStatusEnum = z.enum([
  'ACTIVE',
  'RETURN_PENDING',
  'RETURNED',
  'TRANSFER_PENDING',
  'TRANSFERRED',
  'OVERDUE',
  'REVOKED',
  'CANCELLED',
]);

const createAllocationSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  allocatedToEmployeeId: z.string().nullable().optional(),
  allocatedToDepartmentId: z.string().nullable().optional(),
  expectedReturnDate: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  allocationNote: z.string().nullable().optional(),
});

function getAllocationScopeFilter(auth: { user: any; employee: any }) {
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
        { allocatedToDepartmentId: employee.departmentId },
        { allocatedToEmployee: { departmentId: employee.departmentId } },
      ],
    };
  }
  
  // EMPLOYEE
  return {
    allocatedToEmployeeId: employee.id,
  };
}

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
    const employeeId = searchParams.get('employeeId');
    const departmentId = searchParams.get('departmentId');

    // Build query filters combined with role-based scope filter
    const where: any = {
      isDeleted: false,
      ...getAllocationScopeFilter(auth),
    };

    if (status) where.status = status;
    if (assetId) where.assetId = assetId;
    
    // Merge employee/department filters if requested, keeping within scope boundaries
    if (employeeId) {
      if (where.allocatedToEmployeeId) {
        if (where.allocatedToEmployeeId !== employeeId) return NextResponse.json({ success: true, allocations: [], pagination: { page, limit, totalCount: 0, totalPages: 0 } });
      } else {
        where.allocatedToEmployeeId = employeeId;
      }
    }
    if (departmentId) {
      if (where.allocatedToDepartmentId) {
        if (where.allocatedToDepartmentId !== departmentId) return NextResponse.json({ success: true, allocations: [], pagination: { page, limit, totalCount: 0, totalPages: 0 } });
      } else {
        where.allocatedToDepartmentId = departmentId;
      }
    }

    const [allocations, totalCount] = await prisma.$transaction([
      prisma.assetAllocation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: true,
          allocatedToEmployee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true },
          },
          allocatedToDepartment: true,
          allocatedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.assetAllocation.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      allocations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Fetch allocations error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching allocations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const result = createAllocationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { assetId, allocatedToEmployeeId, allocatedToDepartmentId, expectedReturnDate, allocationNote } = result.data;

    // Mutually exclusive: must allocate to employee OR department, but not both or neither
    const hasEmployee = !!allocatedToEmployeeId;
    const hasDepartment = !!allocatedToDepartmentId;
    if ((hasEmployee && hasDepartment) || (!hasEmployee && !hasDepartment)) {
      return NextResponse.json(
        { success: false, error: 'Allocation must target either an employee or a department, but not both' },
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

    // Verify Employee exists if provided
    if (allocatedToEmployeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: allocatedToEmployeeId },
      });
      if (!employee || employee.isDeleted) {
        return NextResponse.json({ success: false, error: 'Target employee not found' }, { status: 400 });
      }
    }

    // Verify Department exists if provided
    if (allocatedToDepartmentId) {
      const department = await prisma.department.findUnique({
        where: { id: allocatedToDepartmentId },
      });
      if (!department || department.isDeleted) {
        return NextResponse.json({ success: false, error: 'Target department not found' }, { status: 400 });
      }
    }

    // Validate expectedReturnDate in the future if provided
    let returnDate: Date | null = null;
    if (expectedReturnDate) {
      returnDate = new Date(expectedReturnDate);
      if (returnDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: 'Expected return date must be in the future' },
          { status: 400 }
        );
      }
    }

    // THE CONFLICT RULE. An asset already in someone's hands is never taken from
    // them silently — the request is rejected and the caller is pointed at the
    // transfer workflow instead. The response carries the holder's name and the
    // allocation id so the UI can render "Currently held by Priya" next to a
    // Request Transfer button.
    //
    // (Re-checked inside the transaction below, where the DB's partial unique
    // index on isCurrent is the final backstop against a concurrent double
    // allocation. This check exists to produce the friendly 409.)
    const existing = await currentAllocation(prisma, assetId);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Currently held by ${holderName(existing)}`,
          conflict: {
            heldBy: holderName(existing),
            allocationId: existing.id,
            allocatedToEmployeeId: existing.allocatedToEmployeeId,
            allocatedToDepartmentId: existing.allocatedToDepartmentId,
            canRequestTransfer: true,
          },
        },
        { status: 409 }
      );
    }

    // Create allocation in database transaction
    const newAllocation = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction: another request may have allocated this
      // asset between the check above and here.
      const raced = await currentAllocation(tx, assetId);
      if (raced) {
        throw new AllocationConflictError(holderName(raced), raced.id);
      }

      // Create the Allocation record
      const allocation = await tx.assetAllocation.create({
        data: {
          assetId,
          allocatedToEmployeeId: allocatedToEmployeeId || null,
          allocatedToDepartmentId: allocatedToDepartmentId || null,
          allocatedById: auth.employee?.id || null,
          approvedById: auth.employee?.id || null, // Auto-approved by the Admin/Asset Manager actor
          status: 'ACTIVE',
          isCurrent: true,
          expectedReturnDate: returnDate,
          allocationNote: allocationNote || null,
        },
      });

      // Move asset status to ALLOCATED via state-machine
      await applyStatusChange(tx, {
        assetId,
        to: 'ALLOCATED',
        reason: 'ALLOCATION',
        changedById: auth.employee?.id || null,
        note: allocationNote || 'Asset allocated',
      });

      // Create history entry
      await tx.allocationHistory.create({
        data: {
          allocationId: allocation.id,
          event: 'ALLOCATED',
          actorId: auth.employee?.id || null,
          newStatus: 'ACTIVE',
          note: allocationNote || 'Asset allocated',
        },
      });

      return allocation;
    });

    const fullAllocation = await prisma.assetAllocation.findUnique({
      where: { id: newAllocation.id },
      include: {
        asset: true,
        allocatedToEmployee: true,
        allocatedToDepartment: true,
        allocatedBy: true,
      },
    });

    return NextResponse.json({ success: true, allocation: fullAllocation }, { status: 201 });
  } catch (error: any) {
    // Lost the race with a concurrent allocation — same 409 shape as the
    // pre-check above, so the client only has one case to handle.
    if (error instanceof AllocationConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          conflict: {
            heldBy: error.heldBy,
            allocationId: error.allocationId,
            canRequestTransfer: true,
          },
        },
        { status: 409 }
      );
    }

    // Backstop: the DB's partial unique index rejected a concurrent double
    // allocation that slipped past both checks above.
    if (error?.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'This asset was just allocated to someone else. Refresh and try again.',
          conflict: { canRequestTransfer: true },
        },
        { status: 409 }
      );
    }

    if (error instanceof IllegalTransitionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          currentStatus: error.from,
          allowedTransitions: error.allowed,
        },
        { status: 409 }
      );
    }

    console.error('Create allocation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating the allocation' },
      { status: 500 }
    );
  }
}
