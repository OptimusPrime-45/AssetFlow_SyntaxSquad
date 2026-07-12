import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { CustomFieldDataType } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const createFieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, 'Key must contain only alphanumeric characters and underscores').toLowerCase(),
  label: z.string().min(1, 'Label is required'),
  dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON'] as const),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const category = await prisma.assetCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    const fields = await prisma.assetCategoryFieldDefinition.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, fields });
  } catch (error: any) {
    console.error(`GET /api/asset-categories/${categoryId}/fields error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch field definitions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const category = await prisma.assetCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = createFieldSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { key, label, dataType, isRequired, sortOrder } = result.data;

    // Check key uniqueness within this category
    const existing = await prisma.assetCategoryFieldDefinition.findUnique({
      where: {
        categoryId_key: {
          categoryId,
          key,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Field key '${key}' already exists in this category` },
        { status: 400 }
      );
    }

    const newField = await prisma.assetCategoryFieldDefinition.create({
      data: {
        categoryId,
        key,
        label,
        dataType: dataType as CustomFieldDataType,
        isRequired: isRequired !== undefined ? isRequired : false,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, field: newField }, { status: 201 });
  } catch (error: any) {
    console.error(`POST /api/asset-categories/${categoryId}/fields error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to create field definition' },
      { status: 500 }
    );
  }
}
