import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  joinedAt: z.string().optional(),
  leftAt: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: { id, isDeleted: false },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        user: {
          select: { id: true, email: true, role: true, status: true }
        }
      }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    console.error(`GET /api/employees/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // Authorize: Admin/Manager can edit anyone. Employees can only edit themselves.
  const isSelf = auth.employee && auth.employee.id === id;
  const isAdminOrManager = ['ADMIN', 'ASSET_MANAGER'].includes(auth.user.role);

  if (!isSelf && !isAdminOrManager) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You can only update your own profile' },
      { status: 403 }
    );
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
    const result = updateEmployeeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName !== undefined ? data.firstName : undefined,
        lastName: data.lastName !== undefined ? data.lastName : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        designation: data.designation !== undefined ? data.designation : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        joinedAt: data.joinedAt !== undefined ? new Date(data.joinedAt) : undefined,
        leftAt: data.leftAt !== undefined ? (data.leftAt ? new Date(data.leftAt) : null) : undefined,
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
    console.error(`PATCH /api/employees/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}
