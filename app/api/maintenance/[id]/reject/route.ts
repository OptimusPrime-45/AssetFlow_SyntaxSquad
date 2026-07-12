import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const rejectSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can reject maintenance requests' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: { id, isDeleted: false },
    });

    if (!maintenanceRequest) {
      return NextResponse.json({ success: false, error: 'Maintenance request not found' }, { status: 404 });
    }

    if (maintenanceRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot reject a maintenance request in ${maintenanceRequest.status} status` },
        { status: 400 }
      );
    }

    let reason = null;
    try {
      const body = await request.json();
      const result = rejectSchema.safeParse(body);
      if (result.success) {
        reason = result.data.reason ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      await tx.maintenanceHistory.create({
        data: {
          maintenanceRequestId: id,
          event: 'REJECTED',
          actorId: auth.employee!.id,
          previousStatus: 'PENDING',
          newStatus: 'REJECTED',
          note: reason || 'Maintenance request rejected',
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error: any) {
    console.error('Reject maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while rejecting maintenance request' },
      { status: 500 }
    );
  }
}
