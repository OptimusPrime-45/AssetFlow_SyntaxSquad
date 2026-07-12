import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';
import { z } from 'zod';

// Zod v4 requires an explicit key type: z.record(keyType, valueType).
const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.any()),
});

export async function GET() {
  // SystemSetting holds arbitrary org configuration — not something a plain
  // Employee should be able to dump. PATCH was already Admin-only; GET wasn't.
  const auth = await checkAuth(['ADMIN']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const activeSettings = await prisma.systemSetting.findMany({
      where: { isActive: true },
    });

    const settingsMap: Record<string, any> = {};
    activeSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      settings: activeSettings,
      settingsMap,
    });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await checkAuth(['ADMIN']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const result = updateSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { settings } = result.data;

    // Inside transaction, upsert each key-value setting
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: value as any },
          create: {
            key,
            value: value as any,
            isActive: true,
          },
        })
      )
    );

    // Retrieve updated settings
    const activeSettings = await prisma.systemSetting.findMany({
      where: { isActive: true },
    });

    const settingsMap: Record<string, any> = {};
    activeSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: activeSettings,
      settingsMap,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating settings' },
      { status: 500 }
    );
  }
}
