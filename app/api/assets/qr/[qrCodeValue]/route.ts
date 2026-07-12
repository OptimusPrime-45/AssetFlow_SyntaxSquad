import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{ qrCodeValue: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    // Authenticate user
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { qrCodeValue } = await params;

    if (!qrCodeValue) {
      return NextResponse.json({ success: false, error: 'QR Code value is required' }, { status: 400 });
    }

    // Find QR Code entry
    const qrCode = await prisma.assetQrCode.findUnique({
      where: { qrCodeValue },
      include: {
        asset: {
          include: {
            category: true,
            department: true,
          },
        },
      },
    });

    if (!qrCode || !qrCode.isActive || !qrCode.asset || qrCode.asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset or QR code not found' }, { status: 404 });
    }

    // Only a real scan bumps the counter. Without this, every page refresh on the
    // asset detail view inflates scanCount, and "most scanned asset" ends up
    // measuring browser reloads instead of warehouse activity.
    const { searchParams } = new URL(request.url);
    const isScan = searchParams.get('scan') === 'true';

    const updatedQrCode = isScan
      ? await prisma.assetQrCode.update({
          where: { id: qrCode.id },
          data: {
            scanCount: { increment: 1 },
            lastScannedAt: new Date(),
          },
        })
      : qrCode;

    // Attach updated QR Code back to asset object
    const assetWithQr = {
      ...qrCode.asset,
      qrCode: updatedQrCode,
    };

    return NextResponse.json({
      success: true,
      asset: assetWithQr,
    });
  } catch (error: any) {
    console.error('Resolve asset by QR error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
