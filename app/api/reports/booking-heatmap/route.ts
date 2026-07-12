import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

export async function GET() {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const bookings = await prisma.resourceBooking.findMany({
      where: { isDeleted: false },
      include: {
        asset: {
          select: {
            category: {
              select: { name: true }
            }
          }
        }
      }
    });

    // 7 days (0: Sunday, 6: Saturday), 24 hours
    const heatmapGrid: { [key: string]: number } = {};
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmapGrid[`${day}-${hour}`] = 0;
      }
    }

    const categoryStats: { [key: string]: number } = {};

    bookings.forEach((booking) => {
      const start = new Date(booking.startAt);
      const day = start.getDay(); // 0-6
      const hour = start.getHours(); // 0-23
      
      const key = `${day}-${hour}`;
      if (key in heatmapGrid) {
        heatmapGrid[key]++;
      }

      const catName = booking.asset?.category?.name || 'Unknown';
      categoryStats[catName] = (categoryStats[catName] || 0) + 1;
    });

    // Format grid to flat list
    const heatmapList = Object.keys(heatmapGrid).map((key) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        dayOfWeek: day,
        hourOfDay: hour,
        count: heatmapGrid[key],
      };
    });

    return NextResponse.json({
      success: true,
      heatmap: heatmapList,
      byCategory: categoryStats,
    });
  } catch (error: any) {
    console.error('GET /api/reports/booking-heatmap error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate booking heatmap' },
      { status: 500 }
    );
  }
}
