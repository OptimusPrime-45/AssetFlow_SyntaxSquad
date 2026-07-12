import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const cancelSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    if (cycle.status === 'CLOSED') {
      return NextResponse.json({ success: false, error: 'Cannot cancel a closed audit cycle' }, { status: 400 });
    }
    if (cycle.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Audit cycle is already cancelled' }, { status: 400 });
    }

    let reason = null;
    try {
      const body = await request.json();
      const result = cancelSchema.safeParse(body);
      if (result.success) {
        reason = result.data.reason ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updated = await prisma.auditCycle.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationNote: reason || 'Cancelled by administrator',
      },
    });

    return NextResponse.json({ success: true, cycle: updated });
  } catch (error: any) {
    console.error('Cancel audit cycle error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling audit cycle' },
      { status: 500 }
    );
  }
}
