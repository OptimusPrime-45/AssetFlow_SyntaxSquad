import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateAllocationSchema = z.object({
  expectedReturnDate: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  allocationNote: z.string().nullable().optional(),
});

function isAllocationInScope(auth: { user: any; employee: any }, allocation: any): boolean {
  const { user, employee } = auth;

  if (user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') {
    return true;
  }

  if (!employee) {
    return false;
  }

  if (user.role === 'DEPARTMENT_HEAD') {
    if (!employee.departmentId) return false;
    
    const isDeptDirect = allocation.allocatedToDepartmentId === employee.departmentId;
    const isEmployeeInDept = allocation.allocatedToEmployee?.departmentId === employee.departmentId;
    
    return isDeptDirect || isEmployeeInDept;
  }

  // EMPLOYEE
  return allocation.allocatedToEmployeeId === employee.id;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const allocation = await prisma.assetAllocation.findUnique({
      where: { id },
      include: {
        asset: true,
        allocatedToEmployee: true,
        allocatedToDepartment: true,
        allocatedBy: true,
        approvedBy: true,
      },
    });

    if (!allocation || allocation.isDeleted || !isAllocationInScope(auth, allocation)) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      allocation,
    });
  } catch (error: any) {
    console.error('Fetch allocation details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const existingAllocation = await prisma.assetAllocation.findUnique({
      where: { id },
    });

    if (!existingAllocation || existingAllocation.isDeleted) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateAllocationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { expectedReturnDate, allocationNote } = result.data;

    const updateData: any = {};
    const changes: string[] = [];

    if (expectedReturnDate !== undefined) {
      updateData.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
      changes.push(`Expected return date updated to: ${expectedReturnDate || 'none'}`);
    }

    if (allocationNote !== undefined) {
      updateData.allocationNote = allocationNote;
      changes.push(`Note updated to: "${allocationNote || ''}"`);
    }

    if (changes.length === 0) {
      return NextResponse.json({ success: true, allocation: existingAllocation });
    }

    const updatedAllocation = await prisma.$transaction(async (tx) => {
      const updated = await tx.assetAllocation.update({
        where: { id },
        data: updateData,
        include: {
          asset: true,
          allocatedToEmployee: true,
          allocatedToDepartment: true,
          allocatedBy: true,
        },
      });

      // Log to history
      await tx.allocationHistory.create({
        data: {
          allocationId: id,
          event: 'ALLOCATED', // Keeping it in allocation events
          actorId: auth.employee?.id || null,
          previousStatus: existingAllocation.status,
          newStatus: existingAllocation.status,
          note: `Allocation updated. Changes: ${changes.join(', ')}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      allocation: updatedAllocation,
    });
  } catch (error: any) {
    console.error('Update allocation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
