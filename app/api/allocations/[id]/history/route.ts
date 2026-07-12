import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
      include: { allocatedToEmployee: true },
    });

    if (!allocation || allocation.isDeleted || !isAllocationInScope(auth, allocation)) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    // Query history
    const history = await prisma.allocationHistory.findMany({
      where: { allocationId: id, isDeleted: false },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        happenedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('Fetch allocation history error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching allocation history' },
      { status: 500 }
    );
  }
}
