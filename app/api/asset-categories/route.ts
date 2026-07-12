import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  description: z.string().nullable().optional(),
  warrantyMonths: z.number().int().min(0).nullable().optional(),
  hasSerialNumber: z.boolean().optional(),
  isBookable: z.boolean().optional(),
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
    const categories = await prisma.assetCategory.findMany({
      where,
      include: {
        fieldDefinitions: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { assets: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('GET /api/asset-categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset categories' },
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
    const result = createCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code, description, warrantyMonths, hasSerialNumber, isBookable } = result.data;

    // Check name uniqueness
    const existingName = await prisma.assetCategory.findUnique({
      where: { name },
    });
    if (existingName) {
      return NextResponse.json(
        { success: false, error: `Category name '${name}' is already in use` },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existingCode = await prisma.assetCategory.findUnique({
      where: { code },
    });
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Category code '${code}' is already in use` },
        { status: 400 }
      );
    }

    const newCategory = await prisma.assetCategory.create({
      data: {
        name,
        code,
        description: description || null,
        warrantyMonths: warrantyMonths !== undefined ? warrantyMonths : null,
        hasSerialNumber: hasSerialNumber !== undefined ? hasSerialNumber : true,
        isBookable: isBookable !== undefined ? isBookable : false,
      },
    });

    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/asset-categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create asset category' },
      { status: 500 }
    );
  }
}
