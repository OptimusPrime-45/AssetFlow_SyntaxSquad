import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  departmentId: z.string().nullable(),
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
    const employee = await prisma.employee.findFirst({
      where: { id, isDeleted: false },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateDepartmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { departmentId } = result.data;

    // Validate department if provided
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, isDeleted: false },
      });
      if (!dept) {
        return NextResponse.json(
          { success: false, error: 'Department does not exist or is deleted' },
          { status: 400 }
        );
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        departmentId,
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        user: {
          select: { id: true, email: true, role: true, status: true }
        }
      }
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error: any) {
    console.error(`PATCH /api/employees/${id}/department error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee department' },
      { status: 500 }
    );
  }
}
