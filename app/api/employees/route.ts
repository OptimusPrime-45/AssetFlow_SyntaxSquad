import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { EmployeeStatus, UserRole } from '@/app/generated/prisma/enums';
import { z } from 'zod';
import crypto from 'crypto';

const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').toUpperCase(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const).optional(),
  joinedAt: z.string().optional(), // ISO or simple date string
  notes: z.string().nullable().optional(),
  // User association
  userId: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  role: z.enum(['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'] as const).optional(),
});

export async function GET(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const departmentIdParam = searchParams.get('departmentId');
  const statusParam = searchParams.get('status');
  const searchParam = searchParams.get('search');
  const includeDeletedParam = searchParams.get('includeDeleted') === 'true';

  const where: any = {};

  if (!includeDeletedParam) {
    where.isDeleted = false;
  }

  if (departmentIdParam) {
    where.departmentId = departmentIdParam;
  }

  if (statusParam) {
    where.status = statusParam;
  }

  if (searchParam) {
    where.OR = [
      { firstName: { contains: searchParam, mode: 'insensitive' } },
      { lastName: { contains: searchParam, mode: 'insensitive' } },
      { employeeCode: { contains: searchParam, mode: 'insensitive' } },
      {
        user: {
          email: { contains: searchParam, mode: 'insensitive' }
        }
      }
    ];
  }

  try {
    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        user: {
          select: { id: true, email: true, role: true, status: true }
        }
      },
      orderBy: { employeeCode: 'asc' },
    });

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error('GET /api/employees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
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
    const result = createEmployeeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check employee code uniqueness
    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode: data.employeeCode },
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Employee code '${data.employeeCode}' is already in use` },
        { status: 400 }
      );
    }

    // Validate department if provided
    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, isDeleted: false },
      });
      if (!dept) {
        return NextResponse.json(
          { success: false, error: 'Department does not exist or is deleted' },
          { status: 400 }
        );
      }
    }

    let finalUserId: string;

    if (data.userId) {
      // Link to existing user
      const existingUser = await prisma.user.findFirst({
        where: { id: data.userId, isDeleted: false },
      });

      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: 'User does not exist or is deleted' },
          { status: 400 }
        );
      }

      // Check if user is already linked to an employee
      const existingLink = await prisma.employee.findUnique({
        where: { userId: data.userId },
      });

      if (existingLink) {
        return NextResponse.json(
          { success: false, error: 'This user is already linked to an employee profile' },
          { status: 400 }
        );
      }

      finalUserId = data.userId;
    } else {
      // Must create user, so email is required
      if (!data.email) {
        return NextResponse.json(
          { success: false, error: 'Either userId or email is required' },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUserEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUserEmail) {
        return NextResponse.json(
          { success: false, error: `Email '${data.email}' is already registered` },
          { status: 400 }
        );
      }

      // Hash password
      const rawPassword = data.password || crypto.randomBytes(12).toString('hex');
      const passwordHash = await hashPassword(rawPassword);

      // Create user inside a transaction along with employee below
      const createdUser = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role || 'EMPLOYEE',
          status: 'ACTIVE', // Automatically mark active for admin-created employees
        }
      });
      finalUserId = createdUser.id;
    }

    // Create Employee record
    const joinedAtDate = data.joinedAt ? new Date(data.joinedAt) : new Date();

    const employee = await prisma.employee.create({
      data: {
        userId: finalUserId,
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        avatarUrl: data.avatarUrl || null,
        designation: data.designation || null,
        departmentId: data.departmentId || null,
        status: (data.status as EmployeeStatus) || 'ACTIVE',
        joinedAt: joinedAtDate,
        notes: data.notes || null,
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

    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/employees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
