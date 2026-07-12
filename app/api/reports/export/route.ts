import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

function jsonToCsv(items: any[], headers: string[], keys: string[]): string {
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const item of items) {
    const values = keys.map((key) => {
      const val = item[key];
      const escaped = ('' + (val !== null && val !== undefined ? val : '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export async function GET(request: Request) {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['utilization', 'maintenance', 'allocation', 'bookings'].includes(type)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing report type. Must be one of utilization, maintenance, allocation, bookings.' },
      { status: 400 }
    );
  }

  try {
    let csvData = '';

    if (type === 'utilization') {
      const categories = await prisma.assetCategory.findMany({
        where: { isDeleted: false },
        include: {
          assets: {
            where: { isDeleted: false },
            select: { status: true }
          }
        }
      });

      const data = categories.map((category) => {
        const total = category.assets.length;
        const allocated = category.assets.filter(a => a.status === 'ALLOCATED').length;
        const available = category.assets.filter(a => a.status === 'AVAILABLE').length;
        const underMaintenance = category.assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
        const utilizationRate = total > 0 ? ((allocated / total) * 100).toFixed(2) : '0.00';

        return {
          categoryName: category.name,
          categoryCode: category.code,
          totalAssets: total,
          allocatedAssets: allocated,
          availableAssets: available,
          underMaintenanceAssets: underMaintenance,
          utilizationRate,
        };
      });

      csvData = jsonToCsv(
        data,
        ['Category Name', 'Category Code', 'Total Assets', 'Allocated Assets', 'Available Assets', 'Under Maintenance', 'Utilization Rate (%)'],
        ['categoryName', 'categoryCode', 'totalAssets', 'allocatedAssets', 'availableAssets', 'underMaintenanceAssets', 'utilizationRate']
      );
    } 
    else if (type === 'maintenance') {
      const categories = await prisma.assetCategory.findMany({
        where: { isDeleted: false },
        include: {
          assets: {
            where: { isDeleted: false },
            include: {
              maintenanceRequests: {
                where: { isDeleted: false },
              }
            }
          }
        }
      });

      const data = categories.map((category) => {
        let totalRequests = 0;
        let resolvedRequests = 0;
        let pendingRequests = 0;
        let activeRequests = 0;
        let totalDowntimeMs = 0;
        let downtimeCount = 0;

        category.assets.forEach((asset) => {
          asset.maintenanceRequests.forEach((req) => {
            totalRequests++;
            if (req.status === 'RESOLVED') {
              resolvedRequests++;
              if (req.startedAt && req.resolvedAt) {
                const diff = req.resolvedAt.getTime() - req.startedAt.getTime();
                if (diff > 0) {
                  totalDowntimeMs += diff;
                  downtimeCount++;
                }
              }
            } else if (req.status === 'PENDING') {
              pendingRequests++;
            } else if (req.status === 'APPROVED' || req.status === 'TECHNICIAN_ASSIGNED' || req.status === 'IN_PROGRESS') {
              activeRequests++;
            }
          });
        });

        const averageDowntimeHours = downtimeCount > 0 
          ? (totalDowntimeMs / (1000 * 60 * 60 * downtimeCount)).toFixed(2)
          : '0.00';

        return {
          categoryName: category.name,
          categoryCode: category.code,
          totalRequests,
          resolvedRequests,
          pendingRequests,
          activeRequests,
          averageDowntimeHours,
        };
      });

      csvData = jsonToCsv(
        data,
        ['Category Name', 'Category Code', 'Total Requests', 'Resolved Requests', 'Pending Requests', 'Active Requests', 'Average Downtime (Hours)'],
        ['categoryName', 'categoryCode', 'totalRequests', 'resolvedRequests', 'pendingRequests', 'activeRequests', 'averageDowntimeHours']
      );
    } 
    else if (type === 'allocation') {
      const departments = await prisma.department.findMany({
        where: { isDeleted: false },
        include: {
          assets: {
            where: { isDeleted: false },
            select: { acquisitionCost: true }
          },
        }
      });

      const data = await Promise.all(
        departments.map(async (dept) => {
          const totalAssets = dept.assets.length;
          
          const totalValue = dept.assets.reduce((sum, asset) => {
            const cost = asset.acquisitionCost ? Number(asset.acquisitionCost) : 0;
            return sum + cost;
          }, 0);

          const directAllocationsCount = await prisma.assetAllocation.count({
            where: {
              allocatedToDepartmentId: dept.id,
              status: 'ACTIVE',
              isCurrent: true,
              isDeleted: false,
            }
          });

          const employeeAllocationsCount = await prisma.assetAllocation.count({
            where: {
              allocatedToEmployee: {
                departmentId: dept.id,
              },
              status: 'ACTIVE',
              isCurrent: true,
              isDeleted: false,
            }
          });

          return {
            departmentName: dept.name,
            departmentCode: dept.code,
            totalAssetsCount: totalAssets,
            totalAssetValue: totalValue.toFixed(2),
            directAllocationsCount,
            employeeAllocationsCount,
            totalActiveAllocations: directAllocationsCount + employeeAllocationsCount,
          };
        })
      );

      csvData = jsonToCsv(
        data,
        ['Department Name', 'Department Code', 'Total Assets Count', 'Total Assets Value', 'Direct Allocations', 'Employee Allocations', 'Total Active Allocations'],
        ['departmentName', 'departmentCode', 'totalAssetsCount', 'totalAssetValue', 'directAllocationsCount', 'employeeAllocationsCount', 'totalActiveAllocations']
      );
    } 
    else if (type === 'bookings') {
      const bookings = await prisma.resourceBooking.findMany({
        where: { isDeleted: false },
        include: {
          bookedBy: {
            select: { firstName: true, lastName: true }
          },
          bookedForDepartment: {
            select: { name: true }
          },
          asset: {
            select: { name: true, assetTag: true }
          }
        },
        orderBy: { startAt: 'desc' }
      });

      const data = bookings.map((booking) => {
        return {
          title: booking.title,
          bookedBy: `${booking.bookedBy?.firstName || ''} ${booking.bookedBy?.lastName || ''}`.trim(),
          department: booking.bookedForDepartment?.name || '',
          assetName: booking.asset?.name || '',
          assetTag: booking.asset?.assetTag || '',
          purpose: booking.purpose,
          status: booking.status,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          createdAt: booking.createdAt.toISOString(),
        };
      });

      csvData = jsonToCsv(
        data,
        ['Booking Title', 'Booked By', 'Department', 'Asset Name', 'Asset Tag', 'Purpose', 'Status', 'Start At', 'End At', 'Created At'],
        ['title', 'bookedBy', 'department', 'assetName', 'assetTag', 'purpose', 'status', 'startAt', 'endAt', 'createdAt']
      );
    }

    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('GET /api/reports/export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    );
  }
}
