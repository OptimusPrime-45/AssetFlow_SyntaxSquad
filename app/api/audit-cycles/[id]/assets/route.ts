import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    // Determine asset filters based on cycle scope
    const assetFilters: any = {
      isDeleted: false,
      status: { notIn: ['RETIRED', 'DISPOSED'] },
    };

    if (cycle.scopeType === 'DEPARTMENT') {
      if (!cycle.departmentId) {
        return NextResponse.json({ success: true, assets: [] });
      }
      assetFilters.departmentId = cycle.departmentId;
    } else if (cycle.scopeType === 'LOCATION') {
      if (!cycle.locationFilter) {
        return NextResponse.json({ success: true, assets: [] });
      }
      assetFilters.location = {
        contains: cycle.locationFilter,
        mode: 'insensitive',
      };
    }

    const assets = await prisma.asset.findMany({
      where: assetFilters,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        auditResults: {
          where: {
            cycleId: id,
            isDeleted: false,
          },
          select: {
            id: true,
            finding: true,
            observedCondition: true,
            observedStatus: true,
            observedLocation: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { assetTag: 'asc' },
    });

    // Map to add "audited" flag
    const mappedAssets = assets.map((asset) => {
      const result = asset.auditResults[0] || null;
      const { auditResults, ...rest } = asset;
      return {
        ...rest,
        audited: result !== null,
        auditResult: result,
      };
    });

    return NextResponse.json({ success: true, assets: mappedAssets });
  } catch (error: any) {
    console.error('Fetch scope assets error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching scope assets' },
      { status: 500 }
    );
  }
}
