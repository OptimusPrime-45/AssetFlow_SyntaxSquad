import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { withEmployeeCode } from '@/lib/employee-code';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend';

// No employeeCode here on purpose: it is issued by the server, never chosen by
// the person signing up. Accepting it would let anyone claim an arbitrary code
// and probe which codes already exist.
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      designation,
      departmentId,
    } = result.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Check if department exists if departmentId is provided
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return NextResponse.json(
          { success: false, error: 'Invalid department ID' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Signup ALWAYS creates a plain EMPLOYEE. Roles are granted only by an Admin
    // through PATCH /api/employees/:id/role — there is no self-elevation path.
    //
    // Accounts start ACTIVE because no mail service is wired up yet; leaving them
    // PENDING_VERIFICATION would lock every new user out, since a session now
    // requires status === 'ACTIVE'. When a mailer exists, create them as
    // PENDING_VERIFICATION and let /api/auth/verify-email flip them to ACTIVE.
    const { user, employee } = await withEmployeeCode((employeeCode) =>
      prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
        });

        const newEmployee = await tx.employee.create({
          data: {
            userId: newUser.id,
            employeeCode,
            firstName,
            lastName,
            phone: phone || null,
            designation: designation || null,
            departmentId: departmentId || null,
          },
        });

        return { user: newUser, employee: newEmployee };
      })
    );

    // Send welcome email
    await sendEmail({
      to: email,
      subject: 'Welcome to AssetFlow!',
      html: `
        <h2>Welcome to AssetFlow</h2>
        <p>Hi ${firstName},</p>
        <p>Your registration was successful. You can now log in to the portal using your credentials.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Employee Code:</strong> ${employee.employeeCode}</p>
      `
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. You can now log in.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          employee: {
            id: employee.id,
            employeeCode: employee.employeeCode,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during signup' },
      { status: 500 }
    );
  }
}
