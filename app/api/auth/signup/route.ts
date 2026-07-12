import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateVerificationToken } from '@/lib/auth/tokens';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  employeeCode: z.string().min(1, 'Employee code is required'),
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
      employeeCode,
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

    // Check if employeeCode already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee code is already in use' },
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

    // Create User and Employee in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'EMPLOYEE',
          status: 'PENDING_VERIFICATION',
        },
      });

      await tx.employee.create({
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

      return newUser;
    });

    // Generate Verification Token
    const verificationToken = generateVerificationToken(user.id);
    
    // Log the verification URL (mocking email send)
    console.log('\n=========================================');
    console.log(`Email Verification Link: http://localhost:3000/api/auth/verify-email?token=${verificationToken}`);
    console.log('=========================================\n');

    const responsePayload: any = {
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };

    // Return verification token in development for easier API testing
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.verificationToken = verificationToken;
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during signup' },
      { status: 500 }
    );
  }
}
