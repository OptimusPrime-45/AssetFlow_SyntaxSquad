import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { employee } = auth;

    if (!employee) {
      return NextResponse.json({
        success: true,
        allocations: [],
      });
    }

    const myAllocations = await prisma.assetAllocation.findMany({
      where: {
        allocatedToEmployeeId: employee.id,
        isCurrent: true,
        isDeleted: false,
      },
      include: {
        asset: true,
        allocatedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: {
        allocatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      allocations: myAllocations,
    });
  } catch (error: any) {
    console.error('Fetch my allocations error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching your allocations' },
      { status: 500 }
    );
  }
}
