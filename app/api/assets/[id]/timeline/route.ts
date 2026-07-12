import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { assetScopeFilter } from '@/lib/assets/scope';

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

    // The timeline names who held the asset and why it broke — same scope as the
    // asset itself, or an Employee could read the custody history of any laptop.
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
    });

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // Fetch all related timeline components in parallel
    const [statusHistory, allocations, maintenanceRequests, transferRequests] = await Promise.all([
      prisma.assetStatusHistory.findMany({
        where: { assetId: id },
        include: { changedBy: true },
      }),
      prisma.assetAllocation.findMany({
        where: { assetId: id, isDeleted: false },
        include: {
          allocatedToEmployee: true,
          allocatedToDepartment: true,
          allocatedBy: true,
        },
      }),
      prisma.maintenanceRequest.findMany({
        where: { assetId: id, isDeleted: false },
        include: { requestedBy: true },
      }),
      prisma.assetTransferRequest.findMany({
        where: { assetId: id, isDeleted: false },
        include: { requestedBy: true },
      }),
    ]);

    // Format events
    const events: any[] = [];

    statusHistory.forEach((h) => {
      events.push({
        id: h.id,
        type: 'STATUS_CHANGE',
        title: `Status: ${h.toStatus}`,
        description: `Condition is now ${h.toCondition}. Reason: ${h.reason.replace(/_/g, ' ')}. Note: ${h.note || 'None'}`,
        timestamp: h.createdAt,
        actor: h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : 'System',
      });
    });

    allocations.forEach((a) => {
      let details = '';
      if (a.allocatedToEmployee) {
        details = `Allocated to ${a.allocatedToEmployee.firstName} ${a.allocatedToEmployee.lastName}`;
      } else if (a.allocatedToDepartment) {
        details = `Allocated to Department: ${a.allocatedToDepartment.name}`;
      }
      events.push({
        id: a.id,
        type: 'ALLOCATION',
        title: `Asset Allocation: ${a.status}`,
        description: `${details}. Note: ${a.allocationNote || 'None'}`,
        timestamp: a.allocatedAt,
        actor: a.allocatedBy ? `${a.allocatedBy.firstName} ${a.allocatedBy.lastName}` : 'System',
      });
    });

    maintenanceRequests.forEach((m) => {
      events.push({
        id: m.id,
        type: 'MAINTENANCE',
        title: `Maintenance Request: ${m.status}`,
        description: `Issue: ${m.issueTitle}. Priority: ${m.priority}. Details: ${m.issueDescription}`,
        timestamp: m.requestedAt,
        actor: m.requestedBy ? `${m.requestedBy.firstName} ${m.requestedBy.lastName}` : 'System',
      });
    });

    transferRequests.forEach((t) => {
      events.push({
        id: t.id,
        type: 'TRANSFER',
        title: `Transfer Request: ${t.status}`,
        description: `Requested transfer due to: ${t.reason}`,
        timestamp: t.requestedAt,
        actor: t.requestedBy ? `${t.requestedBy.firstName} ${t.requestedBy.lastName}` : 'System',
      });
    });

    // Sort events by timestamp descending (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      timeline: events,
    });
  } catch (error: any) {
    console.error('Fetch asset timeline error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching the timeline' },
      { status: 500 }
    );
  }
}
