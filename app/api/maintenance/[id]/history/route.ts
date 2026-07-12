import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: { id, isDeleted: false },
      include: {
        asset: true,
        requestedBy: true,
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    // Authorization check
    const isRequester = auth.employee?.id === maintenanceRequest.requestedById;
    const isTechnician = auth.employee?.id === maintenanceRequest.assignedTechnicianId;
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';

    let hasAccess = isRequester || isTechnician || isAdminOrManager;

    if (!hasAccess && auth.user.role === 'DEPARTMENT_HEAD' && auth.employee?.departmentId) {
      const deptId = auth.employee.departmentId;
      const isAssetInDept = maintenanceRequest.asset?.departmentId === deptId;
      const isRequesterInDept = maintenanceRequest.requestedBy?.departmentId === deptId;
      if (isAssetInDept || isRequesterInDept) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view this maintenance history' },
        { status: 403 }
      );
    }

    const history = await prisma.maintenanceHistory.findMany({
      where: { maintenanceRequestId: id, isDeleted: false },
      orderBy: { happenedAt: 'desc' },
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
    });

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error('Fetch history error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching history logs' },
      { status: 500 }
    );
  }
}
