import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isReturnInScope(auth: { user: any; employee: any }, returnRequest: any): boolean {
  const { user, employee } = auth;

  if (user.role === 'ADMIN' || user.role === 'ASSET_MANAGER') {
    return true;
  }

  if (!employee) {
    return false;
  }

  if (user.role === 'DEPARTMENT_HEAD') {
    if (!employee.departmentId) return false;
    
    return (
      returnRequest.assetAllocation?.allocatedToDepartmentId === employee.departmentId ||
      returnRequest.assetAllocation?.allocatedToEmployee?.departmentId === employee.departmentId
    );
  }

  // EMPLOYEE
  return (
    returnRequest.returnedById === employee.id ||
    returnRequest.assetAllocation?.allocatedToEmployeeId === employee.id
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const returnRequest = await prisma.assetReturn.findUnique({
      where: { id },
      include: {
        assetAllocation: {
          include: {
            asset: true,
            allocatedToEmployee: {
              include: { department: true },
            },
            allocatedToDepartment: true,
          },
        },
        returnedBy: true,
        receivedBy: true,
      },
    });

    if (!returnRequest || returnRequest.isDeleted || !isReturnInScope(auth, returnRequest)) {
      return NextResponse.json({ success: false, error: 'Return request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      returnRequest,
    });
  } catch (error: any) {
    console.error('Fetch return request details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
