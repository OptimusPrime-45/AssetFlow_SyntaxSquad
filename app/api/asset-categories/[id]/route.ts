import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { AssetCategoryStatus } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  code: z.string().min(1, 'Code cannot be empty').toUpperCase().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).optional(),
  warrantyMonths: z.number().int().min(0).nullable().optional(),
  hasSerialNumber: z.boolean().optional(),
  isBookable: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const category = await prisma.assetCategory.findFirst({
      where: { id, isDeleted: false },
      include: {
        fieldDefinitions: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { assets: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error(`GET /api/asset-categories/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset category' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const category = await prisma.assetCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code, description, status, warrantyMonths, hasSerialNumber, isBookable } = result.data;

    // Check name uniqueness if updated
    if (name && name !== category.name) {
      const existingName = await prisma.assetCategory.findUnique({
        where: { name },
      });
      if (existingName) {
        return NextResponse.json(
          { success: false, error: `Category name '${name}' is already in use` },
          { status: 400 }
        );
      }
    }

    // Check code uniqueness if updated
    if (code && code !== category.code) {
      const existingCode = await prisma.assetCategory.findUnique({
        where: { code },
      });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: `Category code '${code}' is already in use` },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.assetCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? (status as AssetCategoryStatus) : undefined,
        warrantyMonths: warrantyMonths !== undefined ? warrantyMonths : undefined,
        hasSerialNumber: hasSerialNumber !== undefined ? hasSerialNumber : undefined,
        isBookable: isBookable !== undefined ? isBookable : undefined,
      },
    });

    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    console.error(`PATCH /api/asset-categories/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update asset category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const category = await prisma.assetCategory.findFirst({
      where: { id, isDeleted: false },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Asset category not found or already deleted' },
        { status: 404 }
      );
    }

    // Soft delete category
    await prisma.assetCategory.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true, message: 'Asset category successfully soft-deleted' });
  } catch (error: any) {
    console.error(`DELETE /api/asset-categories/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete asset category' },
      { status: 500 }
    );
  }
}
