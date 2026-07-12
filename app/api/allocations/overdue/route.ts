import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

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

export async function GET() {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const now = new Date();
    
    const where: any = {
      isDeleted: false,
      isCurrent: true,
      expectedReturnDate: { lt: now },
      status: { in: ['ACTIVE', 'OVERDUE'] },
      ...getAllocationScopeFilter(auth),
    };

    const overdueAllocations = await prisma.assetAllocation.findMany({
      where,
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
      orderBy: {
        expectedReturnDate: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      allocations: overdueAllocations,
    });
  } catch (error: any) {
    console.error('Fetch overdue allocations error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching overdue allocations' },
      { status: 500 }
    );
  }
}
