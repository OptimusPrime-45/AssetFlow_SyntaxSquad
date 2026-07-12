import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const submitResultSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  finding: z.enum(['VERIFIED', 'MISSING', 'DAMAGED'] as const),
  observedCondition: z.enum(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const).nullable().optional(),
  observedStatus: z.enum(['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'] as const).nullable().optional(),
  observedLocation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findUnique({
      where: { id },
    });

    if (!cycle || cycle.isDeleted) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    const results = await prisma.auditResult.findMany({
      where: { cycleId: id, isDeleted: false },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, location: true, condition: true, status: true },
        },
        auditor: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Fetch audit results error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching audit results' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await checkAuth();
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.employee) {
    return NextResponse.json(
      { success: false, error: 'Only employees with an associated profile can submit audit results' },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;

    const cycle = await prisma.auditCycle.findFirst({
      where: { id, isDeleted: false },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Audit cycle not found' }, { status: 404 });
    }

    if (cycle.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { success: false, error: `Cannot submit results: Audit cycle is in ${cycle.status} status` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = submitResultSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      assetId,
      finding,
      observedCondition,
      observedStatus,
      observedLocation,
      notes,
    } = result.data;

    // Verify asset
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, isDeleted: false },
    });

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Verify user is assigned auditor or admin/manager
    const isAdminOrManager = auth.user.role === 'ADMIN' || auth.user.role === 'ASSET_MANAGER';
    const assignment = await prisma.auditAssignment.findUnique({
      where: {
        cycleId_auditorId: {
          cycleId: id,
          auditorId: auth.employee.id,
        },
      },
    });

    if (!isAdminOrManager && (!assignment || assignment.isDeleted)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not assigned as an auditor for this cycle' },
        { status: 403 }
      );
    }

    const updatedResult = await prisma.$transaction(async (tx) => {
      // 1. If auditor is assigned, transition assignment to IN_PROGRESS on their first submission
      if (assignment && assignment.status === 'ASSIGNED') {
        await tx.auditAssignment.update({
          where: { id: assignment.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
      }

      // 2. Upsert the AuditResult
      const auditResult = await tx.auditResult.upsert({
        where: {
          cycleId_assetId: {
            cycleId: id,
            assetId,
          },
        },
        create: {
          cycleId: id,
          assetId,
          auditorId: auth.employee!.id,
          finding,
          observedCondition,
          observedStatus,
          observedLocation,
          notes,
          submittedAt: new Date(),
        },
        update: {
          auditorId: auth.employee!.id,
          finding,
          observedCondition,
          observedStatus,
          observedLocation,
          notes,
          submittedAt: new Date(),
        },
      });

      // 3. Discrepancy Detection
      const hasFindingDiscrepancy = finding !== 'VERIFIED';
      const hasLocationDiscrepancy = observedLocation !== undefined && observedLocation !== null && observedLocation !== asset.location;
      const hasConditionDiscrepancy = observedCondition !== undefined && observedCondition !== null && observedCondition !== asset.condition;
      const hasStatusDiscrepancy = observedStatus !== undefined && observedStatus !== null && observedStatus !== asset.status;

      const isDiscrepancy = hasFindingDiscrepancy || hasLocationDiscrepancy || hasConditionDiscrepancy || hasStatusDiscrepancy;

      // Find existing discrepancy
      const existingDiscrepancy = await tx.auditDiscrepancy.findFirst({
        where: { cycleId: id, assetId, isDeleted: false },
      });

      if (isDiscrepancy) {
        const descParts: string[] = [];
        if (hasFindingDiscrepancy) descParts.push(`Finding indicates asset is ${finding}.`);
        if (hasLocationDiscrepancy) descParts.push(`Location mismatch: expected "${asset.location || 'none'}", observed "${observedLocation}".`);
        if (hasConditionDiscrepancy) descParts.push(`Condition mismatch: expected "${asset.condition}", observed "${observedCondition}".`);
        if (hasStatusDiscrepancy) descParts.push(`Status mismatch: expected "${asset.status}", observed "${observedStatus}".`);

        const severity = finding === 'MISSING' ? 'CRITICAL' : finding === 'DAMAGED' ? 'HIGH' : 'MEDIUM';
        const title = `Audit Discrepancy: ${asset.name} (${asset.assetTag})`;
        const description = descParts.join(' ');

        if (existingDiscrepancy) {
          // Update existing
          await tx.auditDiscrepancy.update({
            where: { id: existingDiscrepancy.id },
            data: {
              auditResultId: auditResult.id,
              status: 'OPEN',
              severity,
              title,
              description,
            },
          });
        } else {
          // Create new
          await tx.auditDiscrepancy.create({
            data: {
              cycleId: id,
              assetId,
              auditResultId: auditResult.id,
              status: 'OPEN',
              severity,
              title,
              description,
            },
          });
        }
      } else {
        // No discrepancy detected. If one was open, clean it up (dismiss or mark resolved/deleted)
        if (existingDiscrepancy) {
          await tx.auditDiscrepancy.update({
            where: { id: existingDiscrepancy.id },
            data: {
              isDeleted: true,
            },
          });
        }
      }

      return auditResult;
    });

    return NextResponse.json({ success: true, result: updatedResult }, { status: 201 });
  } catch (error: any) {
    console.error('Submit audit result error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while submitting audit result' },
      { status: 500 }
    );
  }
}
