import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { withAssetTag } from '@/lib/asset-tag';
import { assetScopeFilter } from '@/lib/assets/scope';
import { z } from 'zod';
import crypto from 'crypto';

const MAX_PAGE_SIZE = 100;

const AssetConditionEnum = z.enum([
  'NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
]);

// No `assetTag` and no `status`, by design:
//
//   assetTag — issued by the server (AF-0001), like employee codes. It's a label
//   physically stuck on the hardware; letting a client pick it invites collisions
//   with the real world.
//
//   status — a newly registered asset is always AVAILABLE. Accepting a status
//   here would let a caller register an asset straight into ALLOCATED or DISPOSED
//   and skip the lifecycle entirely.
const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  serialNumber: z.string().nullable().optional(),
  acquisitionDate: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  acquisitionCost: z.number().nullable().optional().or(z.string().nullable().optional()),
  condition: AssetConditionEnum.default('GOOD'),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  sharedBookable: z.boolean().default(false),
  qrEnabled: z.boolean().default(true),
});

export async function GET(request: Request) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const categoryId = searchParams.get('categoryId');
    const departmentId = searchParams.get('departmentId');
    const location = searchParams.get('location');
    const sharedBookable = searchParams.get('sharedBookable');
    const search = searchParams.get('search');

    const filters: any = { isDeleted: false };

    if (status) filters.status = status;
    if (condition) filters.condition = condition;
    if (categoryId) filters.categoryId = categoryId;
    if (departmentId) filters.departmentId = departmentId;
    if (location) filters.location = { contains: location, mode: 'insensitive' };
    if (sharedBookable) filters.sharedBookable = sharedBookable === 'true';

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // An Employee only ever sees what's allocated to them; a Dept Head, their
    // department's. AND-ed with the caller's filters so no query can widen it.
    const where = {
      AND: [
        filters,
        assetScopeFilter({
          role: auth.user.role,
          employeeId: auth.employee?.id ?? null,
          departmentId: auth.employee?.departmentId ?? null,
        }),
      ],
    };

    const [assets, totalCount] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          department: true,
          qrCode: true,
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      assets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch assets error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching assets' },
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
    const result = createAssetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check unique serialNumber if provided
    if (data.serialNumber) {
      const existingAssetBySerial = await prisma.asset.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (existingAssetBySerial) {
        return NextResponse.json(
          { success: false, error: `Serial number '${data.serialNumber}' is already in use` },
          { status: 400 }
        );
      }
    }

    // Validate Category exists
    const category = await prisma.assetCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || category.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 400 }
      );
    }

    // Validate Department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department || department.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'Department not found' },
          { status: 400 }
        );
      }
    }

    const acqCost = data.acquisitionCost ? Number(data.acquisitionCost) : null;
    const acqDate = data.acquisitionDate ? new Date(data.acquisitionDate) : null;

    const newAsset = await withAssetTag((assetTag) =>
      prisma.$transaction(async (tx) => {
        const asset = await tx.asset.create({
          data: {
            name: data.name,
            categoryId: data.categoryId,
            assetTag,
            serialNumber: data.serialNumber || null,
            acquisitionDate: acqDate,
            acquisitionCost: acqCost,
            condition: data.condition,
            status: 'AVAILABLE',
            location: data.location || null,
            description: data.description || null,
            departmentId: data.departmentId || null,
            sharedBookable: data.sharedBookable,
            qrEnabled: data.qrEnabled,
          },
        });

        if (data.qrEnabled) {
          await tx.assetQrCode.create({
            data: {
              assetId: asset.id,
              qrCodeValue: crypto.randomUUID(),
              qrPayload: JSON.stringify({
                id: asset.id,
                name: asset.name,
                tag: asset.assetTag,
              }),
              isActive: true,
            },
          });
        }

        // Opening entry of the asset's history: it came into existence AVAILABLE.
        await tx.assetStatusHistory.create({
          data: {
            assetId: asset.id,
            fromStatus: null,
            toStatus: 'AVAILABLE',
            fromCondition: null,
            toCondition: data.condition,
            reason: 'REGISTRATION',
            note: 'Asset registered in system',
            changedById: auth.employee?.id || null,
          },
        });

        return asset;
      })
    );

    const createdAsset = await prisma.asset.findUnique({
      where: { id: newAsset.id },
      include: {
        category: true,
        department: true,
        qrCode: true,
      },
    });

    return NextResponse.json({ success: true, asset: createdAsset }, { status: 201 });
  } catch (error: any) {
    console.error('Create asset error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating the asset' },
      { status: 500 }
    );
  }
}
