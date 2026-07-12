import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { EmployeeStatus, AccountStatus } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const),
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
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = result.data;

    // Determine target user status
    let targetUserStatus: AccountStatus | undefined;
    if (status === 'TERMINATED') {
      targetUserStatus = 'SUSPENDED';
    } else if (status === 'INACTIVE') {
      targetUserStatus = 'INACTIVE';
    } else if (status === 'ACTIVE' || status === 'ON_LEAVE') {
      targetUserStatus = 'ACTIVE';
    }

    // Perform transaction
    await prisma.$transaction(async (tx) => {
      // Update employee status
      await tx.employee.update({
        where: { id },
        data: {
          status: status as EmployeeStatus,
        },
      });

      // Update user account status accordingly
      if (targetUserStatus) {
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            status: targetUserStatus,
          },
        });
      }
    });

    const updatedEmployee = await prisma.employee.findUnique({
      where: { id },
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
    console.error(`PATCH /api/employees/${id}/status error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee status' },
      { status: 500 }
    );
  }
}
