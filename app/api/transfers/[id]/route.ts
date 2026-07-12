import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isTransferInScope(auth: { user: any; employee: any }, transfer: any): boolean {
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
      transfer.fromDepartmentId === employee.departmentId ||
      transfer.toDepartmentId === employee.departmentId ||
      transfer.fromEmployee?.departmentId === employee.departmentId ||
      transfer.toEmployee?.departmentId === employee.departmentId
    );
  }

  // EMPLOYEE
  return (
    transfer.requestedById === employee.id ||
    transfer.fromEmployeeId === employee.id ||
    transfer.toEmployeeId === employee.id
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const transfer = await prisma.assetTransferRequest.findUnique({
      where: { id },
      include: {
        asset: true,
        requestedBy: true,
        fromEmployee: {
          include: { department: true },
        },
        fromDepartment: true,
        toEmployee: {
          include: { department: true },
        },
        toDepartment: true,
        reviewedBy: true,
      },
    });

    if (!transfer || transfer.isDeleted || !isTransferInScope(auth, transfer)) {
      return NextResponse.json({ success: false, error: 'Transfer request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transfer,
    });
  } catch (error: any) {
    console.error('Fetch transfer details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
