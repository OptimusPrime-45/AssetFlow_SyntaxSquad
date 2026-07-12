import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { syncHeadForNewRole } from '@/lib/org/head-sync';
import { UserRole } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] as const),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: { id, isDeleted: false },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { role } = result.data;

    // A Department Head with no department would have a dept-scoped dashboard
    // and no department to scope it to, so refuse rather than create that state.
    if (role === 'DEPARTMENT_HEAD' && !employee.departmentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Assign this employee to a department before promoting them to Department Head',
        },
        { status: 400 }
      );
    }

    // An Admin demoting themselves could leave the org with no Admin at all.
    if (employee.userId === auth.user.id && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: employee.userId },
        data: { role: role as UserRole },
      });

      // Keep department.headEmployeeId consistent with the new role.
      await syncHeadForNewRole(tx, {
        employeeId: id,
        departmentId: employee.departmentId,
        newRole: role,
      });
    });

    const updatedEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true, code: true, headEmployeeId: true }
        },
        user: {
          select: { id: true, email: true, role: true, status: true }
        }
      }
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error: any) {
    console.error(`PATCH /api/employees/${id}/role error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee role' },
      { status: 500 }
    );
  }
}
