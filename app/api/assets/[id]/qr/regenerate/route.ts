import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth/session';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    // Authenticate
    const sessionData = await verifySession();
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = sessionData;
    if (user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset || asset.isDeleted) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const qrCodeValue = crypto.randomUUID();
    const qrPayload = JSON.stringify({
      id: asset.id,
      name: asset.name,
      tag: asset.assetTag,
    });

    // Upsert the QR code for this asset
    const qrCode = await prisma.assetQrCode.upsert({
      where: { assetId: asset.id },
      update: {
        qrCodeValue,
        qrPayload,
        scanCount: 0,
        lastScannedAt: null,
        isActive: true,
      },
      create: {
        assetId: asset.id,
        qrCodeValue,
        qrPayload,
        scanCount: 0,
        isActive: true,
      },
    });

    // Also make sure qrEnabled is set to true on the Asset
    if (!asset.qrEnabled) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { qrEnabled: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'QR code regenerated successfully',
      qrCode,
    });
  } catch (error: any) {
    console.error('Regenerate QR error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while regenerating the QR code' },
      { status: 500 }
    );
  }
}
