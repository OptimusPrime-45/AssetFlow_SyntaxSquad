import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { withEmployeeCode } from '@/lib/employee-code';
import { EmployeeStatus } from '@/app/generated/prisma/enums';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/resend';

// No `role` and no `employeeCode` here, by design:
//
//   role — accepting it let an Asset Manager POST {role: 'ADMIN', password}, then
//   log in as the Admin they just minted. Every account is created as EMPLOYEE;
//   PATCH /api/employees/:id/role (Admin-only) is the sole way to grant a role.
//
//   employeeCode — issued by the server, same as asset tags.
const createEmployeeSchema = z.object({
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

    let existingUserId: string | null = null;

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

      existingUserId = data.userId;
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
    }

    const joinedAtDate = data.joinedAt ? new Date(data.joinedAt) : new Date();

    // Only surfaced when we generated it, so the Admin can pass it on.
    const generatedPassword =
      existingUserId || data.password ? null : crypto.randomBytes(12).toString('hex');

    // User and employee are created together: a failure partway through must not
    // leave behind a User with no Employee profile.
    const employee = await withEmployeeCode((employeeCode) =>
      prisma.$transaction(async (tx) => {
        let userId = existingUserId;

        if (!userId) {
          const passwordHash = await hashPassword(data.password ?? generatedPassword!);
          const createdUser = await tx.user.create({
            data: {
              email: data.email!,
              passwordHash,
              // Always EMPLOYEE — see the note on createEmployeeSchema.
              role: 'EMPLOYEE',
              status: 'ACTIVE',
              emailVerifiedAt: new Date(),
            },
          });
          userId = createdUser.id;
        }

        return tx.employee.create({
          data: {
            userId,
            employeeCode,
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
      })
    );

    if (generatedPassword && data.email) {
      await sendEmail({
        to: data.email,
        subject: 'Welcome to AssetFlow - Your Account Details',
        html: `
          <h2>Welcome to AssetFlow</h2>
          <p>Hi ${data.firstName},</p>
          <p>An employee profile and login account have been created for you.</p>
          <p>Here are your credentials for logging in:</p>
          <p><strong>Portal URL:</strong> http://localhost:3000</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Employee Code:</strong> ${employee.employeeCode}</p>
          <p><strong>Temporary Password:</strong> <code>${generatedPassword}</code></p>
          <p>Please change your password immediately after logging in.</p>
        `
      });
    }

    return NextResponse.json(
      { success: true, employee, ...(generatedPassword ? { generatedPassword } : {}) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/employees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
