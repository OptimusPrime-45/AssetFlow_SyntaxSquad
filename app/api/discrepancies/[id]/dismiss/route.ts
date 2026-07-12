import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const dismissSchema = z.object({
  resolutionNote: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can dismiss discrepancies' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const discrepancy = await prisma.auditDiscrepancy.findFirst({
      where: { id, isDeleted: false },
    });

    if (!discrepancy) {
      return NextResponse.json({ success: false, error: 'Discrepancy not found' }, { status: 404 });
    }

    if (['RESOLVED', 'DISMISSED'].includes(discrepancy.status)) {
      return NextResponse.json(
        { success: false, error: `Discrepancy is already in ${discrepancy.status} status` },
        { status: 400 }
      );
    }

    let resolutionNote = null;
    try {
      const body = await request.json();
      const result = dismissSchema.safeParse(body);
      if (result.success) {
        resolutionNote = result.data.resolutionNote ?? null;
      }
    } catch {
      // Body can be empty
    }

    const updated = await prisma.auditDiscrepancy.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        resolutionNote: resolutionNote || 'Dismissed by administrator',
        resolvedById: auth.employee.id,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, discrepancy: updated });
  } catch (error: any) {
    console.error('Dismiss discrepancy error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while dismissing discrepancy' },
      { status: 500 }
    );
  }
}
