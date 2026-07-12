import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { assetScopeFilter } from '@/lib/assets/scope';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// assetTag is intentionally absent: the tag is a physical label on the hardware.
// Letting it be edited desyncs the database from the sticker on the laptop.
// Status is absent too — it moves only via PATCH /assets/:id/status, which
// enforces the lifecycle state machine.
const updateAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  categoryId: z.string().min(1, 'Category ID is required').optional(),
  serialNumber: z.string().nullable().optional(),
  acquisitionDate: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  acquisitionCost: z.number().nullable().optional().or(z.string().nullable().optional()),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  sharedBookable: z.boolean().optional(),
  qrEnabled: z.boolean().optional(),
});

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    // Same scope as the directory listing: an out-of-scope asset reads as
    // "not found" rather than "forbidden", so the response can't be used to
    // probe which assets exist.
    const asset = await prisma.asset.findFirst({
      where: {
        AND: [
          { id, isDeleted: false },
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
        images: true,
        documents: true,
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
    console.error('Fetch asset error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const existingAsset = await prisma.asset.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingAsset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateAssetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Validate unique serial number
    if (data.serialNumber && data.serialNumber !== existingAsset.serialNumber) {
      const duplicateSerial = await prisma.asset.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (duplicateSerial) {
        return NextResponse.json(
          { success: false, error: `Serial number '${data.serialNumber}' is already in use` },
          { status: 400 }
        );
      }
    }

    // Validate Category exists
    if (data.categoryId) {
      const category = await prisma.assetCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.isDeleted) {
        return NextResponse.json(
          { success: false, error: 'Asset category not found' },
          { status: 400 }
        );
      }
    }

    // Validate Department exists
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

    // Construct update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.sharedBookable !== undefined) updateData.sharedBookable = data.sharedBookable;
    if (data.qrEnabled !== undefined) updateData.qrEnabled = data.qrEnabled;

    if (data.acquisitionCost !== undefined) {
      updateData.acquisitionCost = data.acquisitionCost ? Number(data.acquisitionCost) : null;
    }
    if (data.acquisitionDate !== undefined) {
      updateData.acquisitionDate = data.acquisitionDate ? new Date(data.acquisitionDate) : null;
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        department: true,
        qrCode: true,
      },
    });

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (error: any) {
    console.error('Update asset error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating the asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const existingAsset = await prisma.asset.findFirst({
      where: { id, isDeleted: false },
      include: {
        allocations: {
          where: { isCurrent: true, isDeleted: false },
          include: {
            allocatedToEmployee: { select: { firstName: true, lastName: true } },
            allocatedToDepartment: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Deleting an asset someone is holding would orphan their allocation and
    // lose track of a laptop that physically still exists. Make them return it.
    const held = existingAsset.allocations[0];
    if (held) {
      const holder = held.allocatedToEmployee
        ? `${held.allocatedToEmployee.firstName} ${held.allocatedToEmployee.lastName}`
        : (held.allocatedToDepartment?.name ?? 'someone');

      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete an asset that is currently allocated. It is held by ${holder} — process the return first.`,
          allocationId: held.id,
        },
        { status: 409 }
      );
    }

    // Perform soft-delete
    await prisma.asset.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset soft-deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
