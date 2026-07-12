import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { DepartmentStatus } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const department = await prisma.department.findFirst({
      where: { id, isDeleted: false },
    });

    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = result.data;

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        status: status as DepartmentStatus,
      },
    });

    return NextResponse.json({ success: true, department: updatedDept });
  } catch (error: any) {
    console.error(`PATCH /api/departments/${id}/status error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update department status' },
      { status: 500 }
    );
  }
}
