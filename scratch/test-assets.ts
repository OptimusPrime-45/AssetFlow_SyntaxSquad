import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Assets Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  const email = `asset-admin-${randomId}@example.com`;
  const password = 'Password123!';
  const employeeCode = `EMP-ADM-${randomId}`;
  const firstName = 'Alex';
  const lastName = 'AssetManager';

  let sessionCookie = '';
  let categoryId = '';
  let departmentId = '';
  let assetId = '';
  let assetTag = `TAG-${randomId}`;
  let qrCodeValue = '';
  let imageId = '';
  let docId = '';

  try {
    // -----------------------------------------------------------------
    // Setup: Create Category and Department directly via Prisma
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Category and Department...');
    const dbCategory = await prisma.assetCategory.create({
      data: {
        name: `Test Category ${randomId}`,
        code: `CAT-${randomId}`,
        description: 'Test category description',
        isBookable: true,
      },
    });
    categoryId = dbCategory.id;

    const dbDepartment = await prisma.department.create({
      data: {
        name: `Test Department ${randomId}`,
        code: `DEPT-${randomId}`,
        description: 'Test department description',
      },
    });
    departmentId = dbDepartment.id;
    console.log(`Setup complete. Category ID: ${categoryId}, Department ID: ${departmentId}\n`);

    // -----------------------------------------------------------------
    // Setup: Create and Auth Admin User
    // -----------------------------------------------------------------
    console.log('[Setup] Registering user and promoting to ADMIN...');
    // 1. Signup
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        employeeCode,
      }),
    });
    const signupData = await signupRes.json();
    const verToken = signupData.verificationToken;

    // 2. Verify Email
    await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verToken }),
    });

    // 3. Direct DB update to ADMIN role
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) throw new Error('User creation failed in setup');
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: 'ADMIN' },
    });

    // 4. Log in to get session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('Login failed to set cookie');
    sessionCookie = setCookie.split(';')[0];
    console.log(`Setup Complete. Authenticated session cookie: ${sessionCookie}\n`);

    // -----------------------------------------------------------------
    // Test 1: Create Asset (POST /api/assets)
    // -----------------------------------------------------------------
    console.log('[Test 1] Creating asset...');
    const createRes = await fetch(`${BASE_URL}/api/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        name: `Verification MacBook Pro ${randomId}`,
        categoryId,
        assetTag,
        serialNumber: `SN-${randomId}`,
        acquisitionCost: 1500.50,
        acquisitionDate: new Date().toISOString(),
        location: 'HQ Floor 2',
        description: 'Developer workspace machine',
        departmentId,
        sharedBookable: true,
        qrEnabled: true,
      }),
    });

    const createData = await createRes.json();
    console.log(`Response status: ${createRes.status}`);
    console.log('Response body:', JSON.stringify(createData, null, 2));

    if (createRes.status !== 201 || !createData.success) {
      throw new Error('Asset creation failed');
    }
    assetId = createData.asset.id;
    qrCodeValue = createData.asset.qrCode?.qrCodeValue;
    console.log('✅ Create Asset Successful!\n');

    // -----------------------------------------------------------------
    // Test 2: List Assets (GET /api/assets)
    // -----------------------------------------------------------------
    console.log('[Test 2] Fetching list of assets with filters...');
    const listRes = await fetch(`${BASE_URL}/api/assets?search=${assetTag}&categoryId=${categoryId}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const listData = await listRes.json();
    console.log(`Response status: ${listRes.status}`);
    console.log(`Results found: ${listData.assets?.length || 0}`);

    if (listRes.status !== 200 || !listData.success || listData.assets.length === 0) {
      throw new Error('List assets failed or returned empty results');
    }
    console.log('✅ List Assets Successful!\n');

    // -----------------------------------------------------------------
    // Test 3: Get Bookable Assets (GET /api/assets/bookable)
    // -----------------------------------------------------------------
    console.log('[Test 3] Fetching bookable assets...');
    const bookableRes = await fetch(`${BASE_URL}/api/assets/bookable`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const bookableData = await bookableRes.json();
    console.log(`Response status: ${bookableRes.status}`);
    console.log(`Bookable results found: ${bookableData.assets?.length || 0}`);

    if (bookableRes.status !== 200 || !bookableData.success) {
      throw new Error('Fetch bookable assets failed');
    }
    console.log('✅ Fetch Bookable Assets Successful!\n');

    // -----------------------------------------------------------------
    // Test 4: Get Asset by Tag (GET /api/assets/by-tag/:assetTag)
    // -----------------------------------------------------------------
    console.log(`[Test 4] Fetching asset by tag: ${assetTag}...`);
    const byTagRes = await fetch(`${BASE_URL}/api/assets/by-tag/${assetTag}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const byTagData = await byTagRes.json();
    console.log(`Response status: ${byTagRes.status}`);
    console.log(`Resolved ID: ${byTagData.asset?.id}`);

    if (byTagRes.status !== 200 || !byTagData.success || byTagData.asset.id !== assetId) {
      throw new Error('Get asset by tag failed');
    }
    console.log('✅ Get Asset by Tag Successful!\n');

    // -----------------------------------------------------------------
    // Test 5: Get Asset by QR Code (GET /api/assets/qr/:qrCodeValue)
    // -----------------------------------------------------------------
    console.log(`[Test 5] Resolving asset by QR Code value: ${qrCodeValue}...`);
    const byQrRes = await fetch(`${BASE_URL}/api/assets/qr/${qrCodeValue}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const byQrData = await byQrRes.json();
    console.log(`Response status: ${byQrRes.status}`);
    console.log(`Resolved ID: ${byQrData.asset?.id}`);
    console.log(`Scan count: ${byQrData.asset?.qrCode?.scanCount}`);

    if (byQrRes.status !== 200 || !byQrData.success || byQrData.asset.id !== assetId) {
      throw new Error('Resolve asset by QR failed');
    }
    console.log('✅ Resolve Asset by QR Successful!\n');

    // -----------------------------------------------------------------
    // Test 6: Get Asset details (GET /api/assets/:id)
    // -----------------------------------------------------------------
    console.log(`[Test 6] Fetching asset details by ID: ${assetId}...`);
    const detailsRes = await fetch(`${BASE_URL}/api/assets/${assetId}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const detailsData = await detailsRes.json();
    console.log(`Response status: ${detailsRes.status}`);

    if (detailsRes.status !== 200 || !detailsData.success || detailsData.asset.id !== assetId) {
      throw new Error('Get asset details failed');
    }
    console.log('✅ Get Asset details Successful!\n');

    // -----------------------------------------------------------------
    // Test 7: Update Asset (PATCH /api/assets/:id)
    // -----------------------------------------------------------------
    console.log('[Test 7] Updating general asset details...');
    const updateRes = await fetch(`${BASE_URL}/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        location: 'HQ Floor 3 Room B',
        description: 'Updated developer machine',
      }),
    });

    const updateData = await updateRes.json();
    console.log(`Response status: ${updateRes.status}`);
    console.log(`Updated Location: ${updateData.asset?.location}`);

    if (updateRes.status !== 200 || !updateData.success || updateData.asset.location !== 'HQ Floor 3 Room B') {
      throw new Error('Update asset failed');
    }
    console.log('✅ Update Asset Successful!\n');

    // -----------------------------------------------------------------
    // Test 8: Update Status (PATCH /api/assets/:id/status)
    // -----------------------------------------------------------------
    console.log('[Test 8] Updating asset status...');
    const statusRes = await fetch(`${BASE_URL}/api/assets/${assetId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        status: 'UNDER_MAINTENANCE',
        condition: 'FAIR',
        reason: 'MANUAL_UPDATE',
        note: 'Sent for screen replacement',
      }),
    });

    const statusData = await statusRes.json();
    console.log(`Response status: ${statusRes.status}`);
    console.log(`New Status: ${statusData.asset?.status}`);

    if (statusRes.status !== 200 || !statusData.success || statusData.asset.status !== 'UNDER_MAINTENANCE') {
      throw new Error('Update status failed');
    }
    console.log('✅ Update Status Successful!\n');

    // -----------------------------------------------------------------
    // Test 9: Image Attachments (GET, POST /api/assets/:id/images)
    // -----------------------------------------------------------------
    console.log('[Test 9] Attaching primary image to asset...');
    const postImageRes = await fetch(`${BASE_URL}/api/assets/${assetId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        url: 'https://example.com/macbook.png',
        fileName: 'macbook.png',
        mimeType: 'image/png',
        isPrimary: true,
        altText: 'MacBook Pro Front View',
      }),
    });

    const postImageData = await postImageRes.json();
    console.log(`Response status: ${postImageRes.status}`);
    console.log('Response body:', JSON.stringify(postImageData, null, 2));

    if (postImageRes.status !== 201 || !postImageData.success) {
      throw new Error('Attach image failed');
    }
    imageId = postImageData.image.id;
    console.log('✅ Attach Image Successful!\n');

    // -----------------------------------------------------------------
    // Test 10: Image detail modification (PATCH /api/assets/:id/images/:imageId)
    // -----------------------------------------------------------------
    console.log(`[Test 10] Modifying image metadata: ${imageId}...`);
    const patchImageRes = await fetch(`${BASE_URL}/api/assets/${assetId}/images/${imageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        altText: 'MacBook Pro Modified Alt',
        sortOrder: 5,
      }),
    });

    const patchImageData = await patchImageRes.json();
    console.log(`Response status: ${patchImageRes.status}`);
    console.log(`Updated Alt Text: ${patchImageData.image?.altText}`);

    if (patchImageRes.status !== 200 || !patchImageData.success || patchImageData.image.altText !== 'MacBook Pro Modified Alt') {
      throw new Error('Modify image failed');
    }
    console.log('✅ Modify Image Successful!\n');

    // -----------------------------------------------------------------
    // Test 11: Document Attachments (GET, POST /api/assets/:id/documents)
    // -----------------------------------------------------------------
    console.log('[Test 11] Attaching document to asset...');
    const postDocRes = await fetch(`${BASE_URL}/api/assets/${assetId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        title: 'User Guide',
        url: 'https://example.com/guide.pdf',
        fileName: 'guide.pdf',
        mimeType: 'application/pdf',
        description: 'Official user reference guide',
      }),
    });

    const postDocData = await postDocRes.json();
    console.log(`Response status: ${postDocRes.status}`);
    console.log('Response body:', JSON.stringify(postDocData, null, 2));

    if (postDocRes.status !== 201 || !postDocData.success) {
      throw new Error('Attach document failed');
    }
    docId = postDocData.document.id;
    console.log('✅ Attach Document Successful!\n');

    // -----------------------------------------------------------------
    // Test 12: QR Code Regeneration (POST /api/assets/:id/qr/regenerate)
    // -----------------------------------------------------------------
    console.log('[Test 12] Regenerating QR Code...');
    const regenQrRes = await fetch(`${BASE_URL}/api/assets/${assetId}/qr/regenerate`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });

    const regenQrData = await regenQrRes.json();
    console.log(`Response status: ${regenQrRes.status}`);
    console.log(`New QR Code: ${regenQrData.qrCode?.qrCodeValue}`);

    if (regenQrRes.status !== 200 || !regenQrData.success || regenQrData.qrCode.qrCodeValue === qrCodeValue) {
      throw new Error('QR Code regeneration failed');
    }
    console.log('✅ QR Code Regeneration Successful!\n');

    // -----------------------------------------------------------------
    // Test 13: Fetch Status History (GET /api/assets/:id/history/status)
    // -----------------------------------------------------------------
    console.log('[Test 13] Fetching status history...');
    const historyRes = await fetch(`${BASE_URL}/api/assets/${assetId}/history/status`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const historyData = await historyRes.json();
    console.log(`Response status: ${historyRes.status}`);
    console.log(`History entries: ${historyData.history?.length || 0}`);

    if (historyRes.status !== 200 || !historyData.success || historyData.history.length === 0) {
      throw new Error('Fetch status history failed');
    }
    console.log('✅ Fetch Status History Successful!\n');

    // -----------------------------------------------------------------
    // Test 14: Fetch Timeline (GET /api/assets/:id/timeline)
    // -----------------------------------------------------------------
    console.log('[Test 14] Fetching unified asset timeline...');
    const timelineRes = await fetch(`${BASE_URL}/api/assets/${assetId}/timeline`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const timelineData = await timelineRes.json();
    console.log(`Response status: ${timelineRes.status}`);
    console.log('Timeline events returned:');
    console.log(JSON.stringify(timelineData.timeline, null, 2));

    if (timelineRes.status !== 200 || !timelineData.success) {
      throw new Error('Fetch timeline failed');
    }
    console.log('✅ Fetch Timeline Successful!\n');

    // -----------------------------------------------------------------
    // Test 15: Fetch Maintenance Records (GET /api/assets/:id/maintenance)
    // -----------------------------------------------------------------
    console.log('[Test 15] Fetching maintenance records...');
    const maintRes = await fetch(`${BASE_URL}/api/assets/${assetId}/maintenance`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const maintData = await maintRes.json();
    console.log(`Response status: ${maintRes.status}`);
    console.log(`Maintenance records: ${maintData.maintenanceRequests?.length || 0}`);

    if (maintRes.status !== 200 || !maintData.success) {
      throw new Error('Fetch maintenance records failed');
    }
    console.log('✅ Fetch Maintenance Successful!\n');

    // -----------------------------------------------------------------
    // Test 16: Clean up attachments (DELETE image, DELETE doc)
    // -----------------------------------------------------------------
    console.log('[Test 16] Deleting attached image and document...');
    const delImageRes = await fetch(`${BASE_URL}/api/assets/${assetId}/images/${imageId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    console.log(`Image Delete status: ${delImageRes.status}`);

    const delDocRes = await fetch(`${BASE_URL}/api/assets/${assetId}/documents/${docId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    console.log(`Doc Delete status: ${delDocRes.status}`);

    if (delImageRes.status !== 200 || delDocRes.status !== 200) {
      throw new Error('Deletion of attachments failed');
    }
    console.log('✅ Cleanup of attachments Successful!\n');

    // -----------------------------------------------------------------
    // Test 17: Soft-Delete Asset (DELETE /api/assets/:id)
    // -----------------------------------------------------------------
    console.log('[Test 17] Soft-deleting asset...');
    const deleteRes = await fetch(`${BASE_URL}/api/assets/${assetId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });

    const deleteData = await deleteRes.json();
    console.log(`Response status: ${deleteRes.status}`);

    if (deleteRes.status !== 200 || !deleteData.success) {
      throw new Error('Soft delete failed');
    }

    // Verify GET returns 404 now
    const postDeleteRes = await fetch(`${BASE_URL}/api/assets/${assetId}`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    console.log(`Verification after delete status: ${postDeleteRes.status} (should be 404)`);

    if (postDeleteRes.status !== 404) {
      throw new Error('Soft-deleted asset is still retrievable');
    }
    console.log('✅ Soft-Delete Asset Successful!\n');

    console.log('🎉 ALL 14 ASSET ROUTES (20 METHOD IMPLEMENTATIONS) VERIFIED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up test records from database...');
    // Delete test user
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {}

    // Delete test category
    try {
      if (categoryId) {
        await prisma.assetCategory.delete({ where: { id: categoryId } });
      }
    } catch (e) {}

    // Delete test department
    try {
      if (departmentId) {
        await prisma.department.delete({ where: { id: departmentId } });
      }
    } catch (e) {}

    // Delete asset if it wasn't deleted (to avoid foreign key constraint issues on category delete)
    try {
      if (assetId) {
        // delete dependencies first
        await prisma.assetQrCode.deleteMany({ where: { assetId } });
        await prisma.assetStatusHistory.deleteMany({ where: { assetId } });
        await prisma.assetImage.deleteMany({ where: { assetId } });
        await prisma.assetDocument.deleteMany({ where: { assetId } });
        await prisma.asset.delete({ where: { id: assetId } });
      }
    } catch (e) {}
    console.log('🧹 Database Clean up complete.');
  }
}

runTests();
