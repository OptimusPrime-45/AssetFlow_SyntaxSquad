import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { HELD_ALLOCATION_STATUSES } from '@/lib/allocations/statuses';

export async function GET(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { user, employee } = auth;
  const { searchParams } = new URL(request.url);
  
  // Admins & Asset Managers can optionally query a specific department
  let deptFilter = searchParams.get('departmentId');

  // Enforce scoping based on roles
  let scope = 'GLOBAL';
  let targetDeptId: string | null = null;
  let targetEmpId: string | null = null;

  if (user.role === 'DEPARTMENT_HEAD') {
    scope = 'DEPARTMENT';
    targetDeptId = employee?.departmentId || null;
  } else if (user.role === 'EMPLOYEE') {
    scope = 'EMPLOYEE';
    targetEmpId = employee?.id || null;
  } else if (deptFilter) {
    scope = 'DEPARTMENT';
    targetDeptId = deptFilter;
  }

  // Fail CLOSED. The scoped branches below are guarded by `scope === X && targetId`,
  // so a null id used to fall straight through to the org-wide branch — handing an
  // Employee with no profile, or a Dept Head with no department, the whole company's
  // numbers while still labelling the response "EMPLOYEE". Deny instead.
  if (scope === 'EMPLOYEE' && !targetEmpId) {
    return NextResponse.json(
      { success: false, error: 'No employee profile is linked to this account' },
      { status: 403 }
    );
  }
  if (scope === 'DEPARTMENT' && !targetDeptId) {
    return NextResponse.json(
      { success: false, error: 'You are not assigned to a department' },
      { status: 403 }
    );
  }

  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    let kpis = {
      totalAssets: 0,
      allocatedAssets: 0,
      availableAssets: 0,
      underMaintenance: 0,
      overdueReturns: 0,
      upcomingReturns: 0,
      activeBookings: 0,
      pendingTransfers: 0,
    };

    if (scope === 'EMPLOYEE' && targetEmpId) {
      // Employee: their allocated assets, their upcoming/overdue returns, their active bookings
      kpis.totalAssets = await prisma.assetAllocation.count({
        where: { allocatedToEmployeeId: targetEmpId, status: { in: HELD_ALLOCATION_STATUSES }, isCurrent: true, isDeleted: false }
      });
      kpis.allocatedAssets = kpis.totalAssets;
      kpis.availableAssets = 0;
      kpis.underMaintenance = await prisma.maintenanceRequest.count({
        where: { requestedById: targetEmpId, status: { in: ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'] }, isDeleted: false }
      });
      kpis.overdueReturns = await prisma.assetAllocation.count({
        where: {
          allocatedToEmployeeId: targetEmpId,
          status: { in: HELD_ALLOCATION_STATUSES },
          isCurrent: true,
          expectedReturnDate: { lt: now },
          isDeleted: false
        }
      });
      kpis.upcomingReturns = await prisma.assetAllocation.count({
        where: {
          allocatedToEmployeeId: targetEmpId,
          status: { in: HELD_ALLOCATION_STATUSES },
          isCurrent: true,
          expectedReturnDate: { gte: now, lte: nextWeek },
          isDeleted: false
        }
      });
      kpis.activeBookings = await prisma.resourceBooking.count({
        where: { bookedById: targetEmpId, status: { in: ['PENDING', 'UPCOMING', 'ONGOING'] }, isDeleted: false }
      });
      kpis.pendingTransfers = await prisma.assetTransferRequest.count({
        where: { requestedById: targetEmpId, status: 'PENDING', isDeleted: false }
      });
    } 
    else if (scope === 'DEPARTMENT' && targetDeptId) {
      // Department Head or Admin filtering by department: metrics scoped to the department
      kpis.totalAssets = await prisma.asset.count({
        where: { departmentId: targetDeptId, isDeleted: false }
      });
      kpis.allocatedAssets = await prisma.asset.count({
        where: { departmentId: targetDeptId, status: 'ALLOCATED', isDeleted: false }
      });
      kpis.availableAssets = await prisma.asset.count({
        where: { departmentId: targetDeptId, status: 'AVAILABLE', isDeleted: false }
      });
      kpis.underMaintenance = await prisma.asset.count({
        where: { departmentId: targetDeptId, status: 'UNDER_MAINTENANCE', isDeleted: false }
      });
      kpis.overdueReturns = await prisma.assetAllocation.count({
        where: {
          OR: [
            { allocatedToDepartmentId: targetDeptId },
            { allocatedToEmployee: { departmentId: targetDeptId } }
          ],
          status: { in: HELD_ALLOCATION_STATUSES },
          isCurrent: true,
          expectedReturnDate: { lt: now },
          isDeleted: false
        }
      });
      kpis.upcomingReturns = await prisma.assetAllocation.count({
        where: {
          OR: [
            { allocatedToDepartmentId: targetDeptId },
            { allocatedToEmployee: { departmentId: targetDeptId } }
          ],
          status: { in: HELD_ALLOCATION_STATUSES },
          isCurrent: true,
          expectedReturnDate: { gte: now, lte: nextWeek },
          isDeleted: false
        }
      });
      kpis.activeBookings = await prisma.resourceBooking.count({
        where: {
          OR: [
            { bookedForDepartmentId: targetDeptId },
            { bookedBy: { departmentId: targetDeptId } }
          ],
          status: { in: ['PENDING', 'UPCOMING', 'ONGOING'] },
          isDeleted: false
        }
      });
      kpis.pendingTransfers = await prisma.assetTransferRequest.count({
        where: {
          OR: [
            { fromDepartmentId: targetDeptId },
            { toDepartmentId: targetDeptId },
            { requestedBy: { departmentId: targetDeptId } }
          ],
          status: 'PENDING',
          isDeleted: false
        }
      });
    } 
    else {
      // Global scope: Admins / Asset Managers seeing all metrics
      kpis.totalAssets = await prisma.asset.count({
        where: { isDeleted: false }
      });
      kpis.allocatedAssets = await prisma.asset.count({
        where: { status: 'ALLOCATED', isDeleted: false }
      });
      kpis.availableAssets = await prisma.asset.count({
        where: { status: 'AVAILABLE', isDeleted: false }
      });
      kpis.underMaintenance = await prisma.asset.count({
        where: { status: 'UNDER_MAINTENANCE', isDeleted: false }
      });
      kpis.overdueReturns = await prisma.assetAllocation.count({
        where: { status: { in: HELD_ALLOCATION_STATUSES }, isCurrent: true, expectedReturnDate: { lt: now }, isDeleted: false }
      });
      kpis.upcomingReturns = await prisma.assetAllocation.count({
        where: { status: { in: HELD_ALLOCATION_STATUSES }, isCurrent: true, expectedReturnDate: { gte: now, lte: nextWeek }, isDeleted: false }
      });
      kpis.activeBookings = await prisma.resourceBooking.count({
        where: { status: { in: ['PENDING', 'UPCOMING', 'ONGOING'] }, isDeleted: false }
      });
      kpis.pendingTransfers = await prisma.assetTransferRequest.count({
        where: { status: 'PENDING', isDeleted: false }
      });
    }

    return NextResponse.json({ success: true, scope, kpis });
  } catch (error: any) {
    console.error('GET /api/dashboard/kpis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate dashboard KPIs' },
      { status: 500 }
    );
  }
}
