import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const updateHeadSchema = z.object({
  headEmployeeId: z.string().nullable(),
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
    const result = updateHeadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { headEmployeeId } = result.data;

    if (headEmployeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: headEmployeeId, isDeleted: false },
      });
      if (!employee) {
        return NextResponse.json(
          { success: false, error: 'Employee not found or is deleted' },
          { status: 400 }
        );
      }
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        headEmployeeId,
      },
      include: {
        headEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true }
        }
      }
    });

    return NextResponse.json({ success: true, department: updatedDept });
  } catch (error: any) {
    console.error(`PATCH /api/departments/${id}/head error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update department head' },
      { status: 500 }
    );
  }
}
