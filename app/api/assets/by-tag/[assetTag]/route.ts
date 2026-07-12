import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { assetScopeFilter } from '@/lib/assets/scope';

interface RouteContext {
  params: Promise<{ assetTag: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { assetTag } = await params;

    if (!assetTag) {
      return NextResponse.json({ success: false, error: 'Asset tag is required' }, { status: 400 });
    }

    // Scoped like every other read — otherwise tag lookup would be a way to
    // walk the whole asset directory one AF-000N at a time.
    const asset = await prisma.asset.findFirst({
      where: {
        AND: [
          { assetTag, isDeleted: false },
          assetScopeFilter({
            role: auth.user.role,
            employeeId: auth.employee?.id ?? null,
            departmentId: auth.employee?.departmentId ?? null,
          }),
        ],
      },
      include: {
        category: true,
        department: true,
        qrCode: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error: any) {
    console.error('Fetch asset by tag error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
