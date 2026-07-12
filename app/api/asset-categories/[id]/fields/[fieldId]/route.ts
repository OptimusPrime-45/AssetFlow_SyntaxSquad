import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { CustomFieldDataType } from '@/app/generated/prisma/enums';
import { z } from 'zod';

const updateFieldSchema = z.object({
  label: z.string().min(1).optional(),
  dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON'] as const).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { id: categoryId, fieldId } = await params;
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

    const field = await prisma.assetCategoryFieldDefinition.findFirst({
      where: { id: fieldId, categoryId },
    });

    if (!field) {
      return NextResponse.json(
        { success: false, error: 'Field definition not found in this category' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateFieldSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { label, dataType, isRequired, isActive, sortOrder } = result.data;

    const updatedField = await prisma.assetCategoryFieldDefinition.update({
      where: { id: fieldId },
      data: {
        label: label !== undefined ? label : undefined,
        dataType: dataType !== undefined ? (dataType as CustomFieldDataType) : undefined,
        isRequired: isRequired !== undefined ? isRequired : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      },
    });

    return NextResponse.json({ success: true, field: updatedField });
  } catch (error: any) {
    console.error(`PATCH /api/asset-categories/${categoryId}/fields/${fieldId} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update field definition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const { id: categoryId, fieldId } = await params;
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

    const field = await prisma.assetCategoryFieldDefinition.findFirst({
      where: { id: fieldId, categoryId },
    });

    if (!field) {
      return NextResponse.json(
        { success: false, error: 'Field definition not found in this category' },
        { status: 404 }
      );
    }

    await prisma.assetCategoryFieldDefinition.delete({
      where: { id: fieldId },
    });

    return NextResponse.json({ success: true, message: 'Field definition successfully deleted' });
  } catch (error: any) {
    console.error(`DELETE /api/asset-categories/${categoryId}/fields/${fieldId} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete field definition' },
      { status: 500 }
    );
  }
}
