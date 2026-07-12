import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting System & Supporting Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  
  // Accounts info
  const adminEmail = `sys-admin-${randomId}@example.com`;
  const johnEmail = `sys-john-${randomId}@example.com`;
  const password = 'Password123!';

  let adminCookie = '';
  let johnCookie = '';
  
  let categoryId = '';
  let departmentId = '';
  let assetId = '';
  let employeeId = '';
  let userId = '';
  let allocationId = '';
  let bookingId = '';
  let outboxId = '';

  try {
    // -----------------------------------------------------------------
    // Setup: Category, Department
    // -----------------------------------------------------------------
    console.log('[Setup] Setup Category and Department...');
    const dbCategory = await prisma.assetCategory.create({
      data: {
        name: `System Category ${randomId}`,
        code: `CAT-SY-${randomId}`,
        description: 'Test category description',
      },
    });
    categoryId = dbCategory.id;

    const dbDepartment = await prisma.department.create({
      data: {
        name: `System Department ${randomId}`,
        code: `DEPT-SY-${randomId}`,
        description: 'Test department description',
      },
    });
    departmentId = dbDepartment.id;

    // -----------------------------------------------------------------
    // Setup: Admin Emma and Employee John
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Users...');
    const signupAdminRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password,
        firstName: 'Emma',
        lastName: 'Admin',
        departmentId,
      }),
    });
    const signupAdminData = await signupAdminRes.json();
    
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' },
    });

    const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    adminCookie = loginAdminRes.headers.get('set-cookie')?.split(';')[0] || '';

    const signupJohnRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: johnEmail,
        password,
        firstName: 'John',
        lastName: 'System',
        departmentId,
      }),
    });
    const signupJohnData = await signupJohnRes.json();
    userId = signupJohnData.user.id;

    const dbJohnEmp = await prisma.employee.findFirst({
      where: { userId },
    });
    if (!dbJohnEmp) throw new Error('John Employee registration failed');
    employeeId = dbJohnEmp.id;

    const loginJohnRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: johnEmail, password }),
    });
    johnCookie = loginJohnRes.headers.get('set-cookie')?.split(';')[0] || '';
    console.log('Setup Users Complete.');

    // -----------------------------------------------------------------
    // Test 1: Cloudinary Signature (POST /api/uploads/sign)
    // -----------------------------------------------------------------
    console.log('\n[Test 1] Testing Cloudinary Upload Signing...');
    const signRes = await fetch(`${BASE_URL}/api/uploads/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        folder: 'assets',
      }),
    });

    const signData = await signRes.json();
    console.log(`Response status: ${signRes.status}`);
    console.log('Response body:', JSON.stringify(signData, null, 2));

    if (signRes.status !== 200 || !signData.success || !signData.signature) {
      throw new Error('Upload sign failed');
    }
    // Cloudinary signature for timestamp=1315060095&folder=assets + process.env.CLOUDINARY_API_SECRET
    console.log('✅ Upload sign successfully verified!');

    // -----------------------------------------------------------------
    // Test 2: Settings (PATCH and GET /api/settings)
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Testing System Settings...');
    const updateSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        settings: {
          maintenance_threshold: 5,
          test_cron_secret: 'secret-123',
        },
      }),
    });

    const updateSettingsData = await updateSettingsRes.json();
    console.log(`PATCH settings status: ${updateSettingsRes.status}`);

    const getSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const getSettingsData = await getSettingsRes.json();
    console.log(`GET settings status: ${getSettingsRes.status}`);
    console.log('GET settingsMap:', JSON.stringify(getSettingsData.settingsMap, null, 2));

    if (
      updateSettingsRes.status !== 200 ||
      getSettingsRes.status !== 200 ||
      getSettingsData.settingsMap.maintenance_threshold !== 5
    ) {
      throw new Error('Settings update/retrieval failed');
    }
    console.log('✅ System settings successfully verified!');

    // -----------------------------------------------------------------
    // Test 3: Overdue Flagging Cron (POST /api/cron/flag-overdue)
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Testing Cron: Flag Overdue allocations...');
    // Create asset
    const dbAsset = await prisma.asset.create({
      data: {
        name: `Cron MacBook Pro ${randomId}`,
        categoryId,
        assetTag: `TAG-SY-${randomId}`,
        serialNumber: `SN-SY-${randomId}`,
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });
    assetId = dbAsset.id;

    // Create current active allocation but set return date to yesterday (overdue)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueAlloc = await prisma.assetAllocation.create({
      data: {
        assetId,
        allocatedToEmployeeId: employeeId,
        allocatedById: employeeId,
        status: 'ACTIVE',
        isCurrent: true,
        expectedReturnDate: yesterday,
      },
    });
    allocationId = overdueAlloc.id;

    // Trigger Cron
    const overdueCronRes = await fetch(`${BASE_URL}/api/cron/flag-overdue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-cron-secret'}`,
      },
    });
    const overdueCronData = await overdueCronRes.json();
    console.log(`Cron flag-overdue status: ${overdueCronRes.status}`);
    console.log('Cron response:', JSON.stringify(overdueCronData, null, 2));

    // Verify DB allocation is now status: OVERDUE
    const checkAlloc = await prisma.assetAllocation.findUnique({ where: { id: allocationId } });
    console.log(`Allocation status after cron: ${checkAlloc?.status} (should be OVERDUE)`);

    // Verify Notification is created for John with type OVERDUE_RETURN
    const checkNotif = await prisma.notification.findFirst({
      where: { recipientUserId: userId, type: 'OVERDUE_RETURN', isDeleted: false },
    });
    console.log(`Notification created: ${!!checkNotif}. Title: "${checkNotif?.title}"`);

    if (overdueCronRes.status !== 200 || checkAlloc?.status !== 'OVERDUE' || !checkNotif) {
      throw new Error('Cron flag-overdue failed');
    }
    console.log('✅ Cron flag-overdue successfully verified!');

    // -----------------------------------------------------------------
    // Test 4: Booking Reminders Cron (POST /api/cron/booking-reminders)
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Testing Cron: Booking Reminders...');
    // Create an upcoming Resource Booking starting in 2 hours
    const start = new Date();
    start.setHours(start.getHours() + 2);
    const end = new Date();
    end.setHours(end.getHours() + 5);

    const booking = await prisma.resourceBooking.create({
      data: {
        assetId,
        bookedById: employeeId,
        title: 'Cron Design Sprint Room Booking',
        purpose: 'ROOM',
        status: 'UPCOMING',
        startAt: start,
        endAt: end,
      },
    });
    bookingId = booking.id;

    // Trigger Cron
    const reminderRes = await fetch(`${BASE_URL}/api/cron/booking-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-cron-secret'}`,
      },
    });
    const reminderData = await reminderRes.json();
    console.log(`Cron booking-reminders status: ${reminderRes.status}`);
    console.log('Cron response:', JSON.stringify(reminderData, null, 2));

    // Verify notification created
    const checkReminderNotif = await prisma.notification.findFirst({
      where: { recipientUserId: userId, type: 'BOOKING_REMINDER', entityId: bookingId, isDeleted: false },
    });
    console.log(`Booking reminder notification created: ${!!checkReminderNotif}`);

    if (reminderRes.status !== 200 || !checkReminderNotif) {
      throw new Error('Cron booking-reminders failed');
    }
    console.log('✅ Cron booking-reminders successfully verified!');

    // -----------------------------------------------------------------
    // Test 5: Booking Transitions Cron (POST /api/cron/booking-transitions)
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Testing Cron: Booking Transitions...');
    // Currently startAt <= now is false because it starts in 2 hours.
    // Let's manually set startAt to yesterday and endAt to 2 hours in the future
    const pastStart = new Date();
    pastStart.setHours(pastStart.getHours() - 1);
    await prisma.resourceBooking.update({
      where: { id: bookingId },
      data: { startAt: pastStart },
    });

    // Trigger transitions cron
    const transRes = await fetch(`${BASE_URL}/api/cron/booking-transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-cron-secret'}`,
      },
    });
    const transData = await transRes.json();
    console.log(`Cron booking-transitions status: ${transRes.status}`);
    console.log('Cron response:', JSON.stringify(transData, null, 2));

    // Verify status became ONGOING
    const checkBooking = await prisma.resourceBooking.findUnique({ where: { id: bookingId } });
    console.log(`Booking status: ${checkBooking?.status} (should be ONGOING)`);

    // Let's set endAt to past as well to verify completion transition
    const pastEnd = new Date();
    pastEnd.setMinutes(pastEnd.getMinutes() - 10);
    await prisma.resourceBooking.update({
      where: { id: bookingId },
      data: { endAt: pastEnd },
    });

    // Trigger again
    const transRes2 = await fetch(`${BASE_URL}/api/cron/booking-transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-cron-secret'}`,
      },
    });
    const checkBookingCompleted = await prisma.resourceBooking.findUnique({ where: { id: bookingId } });
    console.log(`Booking status: ${checkBookingCompleted?.status} (should be COMPLETED)`);

    if (transRes.status !== 200 || checkBooking?.status !== 'ONGOING' || checkBookingCompleted?.status !== 'COMPLETED') {
      throw new Error('Cron booking-transitions failed');
    }
    console.log('✅ Cron booking-transitions successfully verified!');

    // -----------------------------------------------------------------
    // Test 6: Outbox Processor Cron (POST /api/cron/process-outbox)
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Testing Cron: Outbox processing...');
    // Create pending outbox event
    const outbox = await prisma.outboxEvent.create({
      data: {
        eventType: 'ASSET_ALLOCATED',
        aggregateType: 'AssetAllocation',
        aggregateId: allocationId,
        payload: { allocationId },
        status: 'PENDING',
      },
    });
    outboxId = outbox.id;

    // Trigger Cron
    const outboxRes = await fetch(`${BASE_URL}/api/cron/process-outbox`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-cron-secret'}`,
      },
    });
    const outboxData = await outboxRes.json();
    console.log(`Cron process-outbox status: ${outboxRes.status}`);
    console.log('Cron response:', JSON.stringify(outboxData, null, 2));

    // Verify DB status is PROCESSED
    const checkOutbox = await prisma.outboxEvent.findUnique({ where: { id: outboxId } });
    console.log(`Outbox event status: ${checkOutbox?.status} (should be PROCESSED)`);

    if (outboxRes.status !== 200 || checkOutbox?.status !== 'PROCESSED') {
      throw new Error('Cron process-outbox failed');
    }
    console.log('✅ Cron process-outbox successfully verified!');

    console.log('\n🎉 ALL 6 SYSTEM & SUPPORTING API ROUTES VERIFIED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up test records from database...');
    // Delete notifications
    try {
      await prisma.notification.deleteMany({ where: { recipientUserId: userId } });
    } catch (e) {}

    // Delete bookings
    try {
      if (bookingId) {
        await prisma.resourceBooking.delete({ where: { id: bookingId } });
      }
    } catch (e) {}

    // Delete outbox event
    try {
      if (outboxId) {
        await prisma.outboxEvent.delete({ where: { id: outboxId } });
      }
    } catch (e) {}

    // Delete allocation
    try {
      if (allocationId) {
        await prisma.allocationHistory.deleteMany({ where: { allocationId } });
        await prisma.assetAllocation.delete({ where: { id: allocationId } });
      }
    } catch (e) {}

    // Delete asset
    try {
      if (assetId) {
        await prisma.assetStatusHistory.deleteMany({ where: { assetId } });
        await prisma.asset.delete({ where: { id: assetId } });
      }
    } catch (e) {}

    // Delete settings
    try {
      await prisma.systemSetting.deleteMany({
        where: { key: { in: ['maintenance_threshold', 'test_cron_secret'] } },
      });
    } catch (e) {}

    // Delete test users
    try {
      const userA = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (userA) {
        await prisma.employee.deleteMany({ where: { userId: userA.id } });
        await prisma.user.delete({ where: { id: userA.id } });
      }
      const userJ = await prisma.user.findUnique({ where: { email: johnEmail } });
      if (userJ) {
        await prisma.employee.deleteMany({ where: { userId: userJ.id } });
        await prisma.user.delete({ where: { id: userJ.id } });
      }
    } catch (e) {}

    // Delete category & department
    try {
      if (categoryId) {
        await prisma.assetCategory.delete({ where: { id: categoryId } });
      }
    } catch (e) {}

    try {
      if (departmentId) {
        await prisma.department.delete({ where: { id: departmentId } });
      }
    } catch (e) {}

    console.log('🧹 Database Clean up complete.');
  }
}

runTests();
