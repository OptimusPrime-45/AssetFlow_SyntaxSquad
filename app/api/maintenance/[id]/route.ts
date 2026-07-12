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
        asset: {
          select: {
            id: true,
            name: true,
            assetTag: true,
            status: true,
            condition: true,
            departmentId: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            departmentId: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
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
        attachments: {
          where: { isPrimary: false }, // optional filter or get all, standard is to get all
          orderBy: { sortOrder: 'asc' },
        },
        history: {
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
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    // Access control check
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
        { success: false, error: 'Forbidden: Insufficient permissions to view this maintenance request' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, request: maintenanceRequest });
  } catch (error: any) {
    console.error('Fetch maintenance details error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching maintenance details' },
      { status: 500 }
    );
  }
}
