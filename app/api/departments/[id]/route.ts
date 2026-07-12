import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  code: z.string().min(1, 'Code cannot be empty').toUpperCase().optional(),
  description: z.string().nullable().optional(),
  parentDepartmentId: z.string().nullable().optional(),
});

// Helper for cycle detection when setting parentDepartmentId
async function detectCycle(deptId: string, parentCandidateId: string): Promise<boolean> {
  if (deptId === parentCandidateId) return true;

  let currentId = parentCandidateId;
  // Keep moving up the parent chain
  while (currentId) {
    const parentDept = await prisma.department.findUnique({
      where: { id: currentId },
      select: { parentDepartmentId: true },
    });
    if (!parentDept || !parentDept.parentDepartmentId) {
      break;
    }
    if (parentDept.parentDepartmentId === deptId) {
      return true;
    }
    currentId = parentDept.parentDepartmentId;
  }
  return false;
}

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
    const department = await prisma.department.findFirst({
      where: { id, isDeleted: false },
      include: {
        parentDepartment: {
          select: { id: true, name: true, code: true }
        },
        childDepartments: {
          where: { isDeleted: false },
          select: { id: true, name: true, code: true, status: true }
        },
        headEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true }
        },
        _count: {
          select: { employees: true }
        }
      }
    });

    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, department });
  } catch (error: any) {
    console.error(`GET /api/departments/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department' },
      { status: 500 }
    );
  }
}

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
    const result = updateDepartmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code, description, parentDepartmentId } = result.data;

    // Check code uniqueness if changed
    if (code && code !== department.code) {
      const existing = await prisma.department.findUnique({
        where: { code },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Department code '${code}' is already in use` },
          { status: 400 }
        );
      }
    }

    // Check parentDepartmentId if updated
    if (parentDepartmentId && parentDepartmentId !== department.parentDepartmentId) {
      const parent = await prisma.department.findFirst({
        where: { id: parentDepartmentId, isDeleted: false },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent department does not exist or is deleted' },
          { status: 400 }
        );
      }

      // Check cycle detection
      const hasCycle = await detectCycle(id, parentDepartmentId);
      if (hasCycle) {
        return NextResponse.json(
          { success: false, error: 'Setting this parent department would create a cyclic relationship hierarchy' },
          { status: 400 }
        );
      }
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        parentDepartmentId: parentDepartmentId !== undefined ? parentDepartmentId : undefined,
      },
      include: {
        parentDepartment: {
          select: { id: true, name: true, code: true }
        },
        headEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        }
      }
    });

    return NextResponse.json({ success: true, department: updatedDept });
  } catch (error: any) {
    console.error(`PATCH /api/departments/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { success: false, error: 'Department not found or already deleted' },
        { status: 404 }
      );
    }

    // Soft delete department and orphan child departments in a transaction
    await prisma.$transaction(async (tx) => {
      // Set child departments parent to null
      await tx.department.updateMany({
        where: { parentDepartmentId: id },
        data: { parentDepartmentId: null },
      });

      // Soft delete this department
      await tx.department.update({
        where: { id },
        data: { isDeleted: true },
      });
    });

    return NextResponse.json({ success: true, message: 'Department successfully soft-deleted' });
  } catch (error: any) {
    console.error(`DELETE /api/departments/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
