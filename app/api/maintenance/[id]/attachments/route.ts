import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createAttachmentSchema = z.object({
  url: z.string().url('Invalid attachment URL'),
  fileName: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  caption: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

async function verifyAccess(auth: any, requestId: string) {
  const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, isDeleted: false },
    include: {
      asset: true,
      requestedBy: true,
    },
  });

  if (!maintenanceRequest) {
    return { error: 'Maintenance request not found', status: 404 };
  }

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
    return { error: 'Forbidden: Insufficient permissions to access this maintenance request', status: 403 };
  }

  return { request: maintenanceRequest };
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const access = await verifyAccess(auth, id);

    if ('error' in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const attachments = await prisma.maintenanceAttachment.findMany({
      where: { maintenanceRequestId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, attachments });
  } catch (error: any) {
    console.error('Fetch attachments error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching attachments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const access = await verifyAccess(auth, id);

    if ('error' in access) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const result = createAttachmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const attachment = await prisma.$transaction(async (tx) => {
      // Create attachment
      const created = await tx.maintenanceAttachment.create({
        data: {
          maintenanceRequestId: id,
          url: data.url,
          fileName: data.fileName ?? null,
          mimeType: data.mimeType ?? null,
          fileSize: data.fileSize ?? null,
          caption: data.caption ?? null,
          isPrimary: data.isPrimary,
          sortOrder: data.sortOrder,
        },
      });

      // Log note/history event
      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'NOTE_ADDED',
          actorId: auth.employee!.id,
          previousStatus: access.request!.status,
          newStatus: access.request!.status,
          note: `Attachment added: ${data.fileName || data.url}`,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, attachment }, { status: 201 });
  } catch (error: any) {
    console.error('Create attachment error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while adding attachment' },
      { status: 500 }
    );
  }
}
