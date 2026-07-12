import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { syncRolesForNewHead } from '@/lib/org/head-sync';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  description: z.string().nullable().optional(),
  parentDepartmentId: z.string().nullable().optional(),
  headEmployeeId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const searchParam = searchParams.get('search');
  const includeDeletedParam = searchParams.get('includeDeleted') === 'true';

  const where: any = {};

  if (!includeDeletedParam) {
    where.isDeleted = false;
  }

  if (statusParam === 'ACTIVE' || statusParam === 'INACTIVE') {
    where.status = statusParam;
  }

  if (searchParam) {
    where.OR = [
      { name: { contains: searchParam, mode: 'insensitive' } },
      { code: { contains: searchParam, mode: 'insensitive' } },
    ];
  }

  try {
    const departments = await prisma.department.findMany({
      where,
      include: {
        parentDepartment: {
          select: { id: true, name: true, code: true }
        },
        headEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        },
        _count: {
          select: { employees: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    console.error('GET /api/departments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const result = createDepartmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code, description, parentDepartmentId, headEmployeeId } = result.data;

    // Check code uniqueness globally since schema has @unique constraint on code
    const existing = await prisma.department.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Department code '${code}' is already in use` },
        { status: 400 }
      );
    }

    // Validate parent department exists and is not deleted
    if (parentDepartmentId) {
      const parent = await prisma.department.findFirst({
        where: { id: parentDepartmentId, isDeleted: false },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent department does not exist or is deleted' },
          { status: 400 }
        );
      }
    }

    // Validate head employee exists and is not deleted
    if (headEmployeeId) {
      const head = await prisma.employee.findFirst({
        where: { id: headEmployeeId, isDeleted: false },
      });
      if (!head) {
        return NextResponse.json(
          { success: false, error: 'Head employee does not exist or is deleted' },
          { status: 400 }
        );
      }
    }

    const newDept = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          name,
          code,
          description: description || null,
          parentDepartmentId: parentDepartmentId || null,
          headEmployeeId: headEmployeeId || null,
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

      // Same rule as PATCH /api/departments/:id/head — heading a department *is*
      // the DEPARTMENT_HEAD role, so a head named at creation time gets it too.
      await syncRolesForNewHead(tx, {
        previousHeadId: null,
        newHeadId: headEmployeeId || null,
      });

      return dept;
    });

    return NextResponse.json({ success: true, department: newDept }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/departments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
