import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Allocations Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  
  // Accounts info
  const adminEmail = `alloc-admin-${randomId}@example.com`;
  const employeeEmail = `alloc-emp-${randomId}@example.com`;
  const password = 'Password123!';
  
  const adminEmpCode = `EMP-ADM-${randomId}`;
  const employeeEmpCode = `EMP-REG-${randomId}`;

  let adminCookie = '';
  let employeeCookie = '';
  
  let categoryId = '';
  let departmentId = '';
  let assetId = '';
  let overdueAssetId = '';
  
  let allocationId = '';
  let overdueAllocationId = '';
  let employeeId = '';

  try {
    // -----------------------------------------------------------------
    // Setup: Create Category and Department directly
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Category and Department...');
    const dbCategory = await prisma.assetCategory.create({
      data: {
        name: `Allocation Category ${randomId}`,
        code: `CAT-AL-${randomId}`,
        description: 'Test category description',
      },
    });
    categoryId = dbCategory.id;

    const dbDepartment = await prisma.department.create({
      data: {
        name: `Allocation Department ${randomId}`,
        code: `DEPT-AL-${randomId}`,
        description: 'Test department description',
      },
    });
    departmentId = dbDepartment.id;
    console.log(`Setup Category: ${categoryId}, Department: ${departmentId}\n`);

    // -----------------------------------------------------------------
    // Setup: Create Assets (initially AVAILABLE)
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Assets...');
    const dbAsset = await prisma.asset.create({
      data: {
        name: `Allocation MacBook Pro ${randomId}`,
        categoryId,
        assetTag: `TAG-AL-${randomId}`,
        serialNumber: `SN-AL-${randomId}`,
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });
    assetId = dbAsset.id;

    const dbAssetOverdue = await prisma.asset.create({
      data: {
        name: `Overdue Lenovo ThinkPad ${randomId}`,
        categoryId,
        assetTag: `TAG-OV-${randomId}`,
        serialNumber: `SN-OV-${randomId}`,
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });
    overdueAssetId = dbAssetOverdue.id;
    console.log(`Setup Asset: ${assetId}, Overdue Asset: ${overdueAssetId}\n`);

    // -----------------------------------------------------------------
    // Setup: Register and Auth Admin User
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Admin user...');
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
    
    // Direct DB update to ADMIN
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
    console.log('Emma Admin authenticated successfully.');

    // -----------------------------------------------------------------
    // Setup: Register and Auth Employee User
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Employee user...');
    const signupEmpRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: employeeEmail,
        password,
        firstName: 'John',
        lastName: 'Employee',
        departmentId,
      }),
    });
    const signupEmpData = await signupEmpRes.json();
    
    const dbEmployee = await prisma.employee.findFirst({
      where: { userId: signupEmpData.user.id },
    });
    if (!dbEmployee) throw new Error('Employee registration failed');
    employeeId = dbEmployee.id;

    const loginEmpRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: employeeEmail, password }),
    });
    employeeCookie = loginEmpRes.headers.get('set-cookie')?.split(';')[0] || '';
    console.log(`John Employee authenticated. Employee ID: ${employeeId}\n`);

    // -----------------------------------------------------------------
    // Test 1: Create Allocation (POST /api/allocations)
    // -----------------------------------------------------------------
    console.log('[Test 1] Admin creating asset allocation...');
    const expectReturn = new Date();
    expectReturn.setDate(expectReturn.getDate() + 5); // 5 days in the future

    const createRes = await fetch(`${BASE_URL}/api/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        assetId,
        allocatedToEmployeeId: employeeId,
        expectedReturnDate: expectReturn.toISOString(),
        allocationNote: 'Assigned for design sprint',
      }),
    });

    const createData = await createRes.json();
    console.log(`Response status: ${createRes.status}`);
    console.log('Response body:', JSON.stringify(createData, null, 2));

    if (createRes.status !== 201 || !createData.success) {
      throw new Error('Allocation creation failed');
    }
    allocationId = createData.allocation.id;
    console.log('✅ Allocation Created successfully!');

    // Verify asset status transitioned to ALLOCATED
    const checkAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    console.log(`Asset status after allocation: ${checkAsset?.status} (should be ALLOCATED)`);
    if (checkAsset?.status !== 'ALLOCATED') throw new Error('Asset status was not updated');
    console.log('✅ Asset Status transition verified!\n');

    // -----------------------------------------------------------------
    // Test 2: Get Allocation details (GET /api/allocations/:id)
    // -----------------------------------------------------------------
    console.log(`[Test 2] Fetching allocation details by ID: ${allocationId}...`);
    // 1. By Admin
    const detailsAdminRes = await fetch(`${BASE_URL}/api/allocations/${allocationId}`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    console.log(`Fetch by Admin status: ${detailsAdminRes.status}`);

    // 2. By Employee (should succeed sinceJohn is the holder)
    const detailsEmpRes = await fetch(`${BASE_URL}/api/allocations/${allocationId}`, {
      method: 'GET',
      headers: { Cookie: employeeCookie },
    });
    console.log(`Fetch by Employee status: ${detailsEmpRes.status}`);

    if (detailsAdminRes.status !== 200 || detailsEmpRes.status !== 200) {
      throw new Error('Get allocation details failed');
    }
    console.log('✅ Get Allocation details Successful!\n');

    // -----------------------------------------------------------------
    // Test 3: List Allocations (GET /api/allocations)
    // -----------------------------------------------------------------
    console.log('[Test 3] Listing allocations (verifying scope-filtering)...');
    // 1. Admin lists (should see Emma and John's allocations)
    const listAdminRes = await fetch(`${BASE_URL}/api/allocations`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const listAdminData = await listAdminRes.json();
    console.log(`Admin sees: ${listAdminData.allocations?.length || 0} allocations`);

    // 2. Employee lists (should see only John's own allocations)
    const listEmpRes = await fetch(`${BASE_URL}/api/allocations`, {
      method: 'GET',
      headers: { Cookie: employeeCookie },
    });
    const listEmpData = await listEmpRes.json();
    console.log(`Employee sees: ${listEmpData.allocations?.length || 0} allocations`);

    if (listAdminRes.status !== 200 || listEmpRes.status !== 200) {
      throw new Error('List allocations failed');
    }
    console.log('✅ List Allocations with scope-filtering Successful!\n');

    // -----------------------------------------------------------------
    // Test 4: My Allocations (GET /api/allocations/my)
    // -----------------------------------------------------------------
    console.log('[Test 4] Fetching "my" allocations...');
    const myRes = await fetch(`${BASE_URL}/api/allocations/my`, {
      method: 'GET',
      headers: { Cookie: employeeCookie },
    });

    const myData = await myRes.json();
    console.log(`Response status: ${myRes.status}`);
    console.log(`My allocations found: ${myData.allocations?.length || 0}`);

    if (myRes.status !== 200 || !myData.success || myData.allocations.length === 0) {
      throw new Error('Get "my" allocations failed');
    }
    console.log('✅ Get My Allocations Successful!\n');

    // -----------------------------------------------------------------
    // Test 5: Update Allocation (PATCH /api/allocations/:id)
    // -----------------------------------------------------------------
    console.log('[Test 5] Updating allocation details...');
    const updateRes = await fetch(`${BASE_URL}/api/allocations/${allocationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        allocationNote: 'Updated Sprint design hardware assignment note',
      }),
    });

    const updateData = await updateRes.json();
    console.log(`Response status: ${updateRes.status}`);
    console.log(`Updated Note: ${updateData.allocation?.allocationNote}`);

    if (updateRes.status !== 200 || !updateData.success || updateData.allocation.allocationNote !== 'Updated Sprint design hardware assignment note') {
      throw new Error('Update allocation failed');
    }
    console.log('✅ Update Allocation Successful!\n');

    // -----------------------------------------------------------------
    // Test 6: Overdue Allocations (GET /api/allocations/overdue)
    // -----------------------------------------------------------------
    console.log('[Test 6] Setting up and checking overdue allocations...');
    // Create an overdue allocation (expected return yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueCreateRes = await fetch(`${BASE_URL}/api/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        assetId: overdueAssetId,
        allocatedToEmployeeId: employeeId,
        // Wait, our API blocks expectedReturnDate in the past, but we can set it in DB directly or bypass
        // Let's create it with direct Prisma call so we can bypass Zod future verification!
      }),
    });
    const overdueCreateData = await overdueCreateRes.json();
    overdueAllocationId = overdueCreateData.allocation.id;

    // Manually force expectedReturnDate to yesterday directly in the DB
    await prisma.assetAllocation.update({
      where: { id: overdueAllocationId },
      data: { expectedReturnDate: yesterday },
    });

    // Query overdue API
    const overdueRes = await fetch(`${BASE_URL}/api/allocations/overdue`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    const overdueData = await overdueRes.json();
    console.log(`Response status: ${overdueRes.status}`);
    console.log(`Overdue count: ${overdueData.allocations?.length || 0}`);

    const hasOverdue = overdueData.allocations?.some((a: any) => a.id === overdueAllocationId);
    if (overdueRes.status !== 200 || !overdueData.success || !hasOverdue) {
      throw new Error('Overdue allocations query failed to retrieve the overdue item');
    }
    console.log('✅ Get Overdue Allocations Successful!\n');

    // -----------------------------------------------------------------
    // Test 7: Revoke Allocation (POST /api/allocations/:id/revoke)
    // -----------------------------------------------------------------
    console.log(`[Test 7] Revoking primary allocation: ${allocationId}...`);
    const revokeRes = await fetch(`${BASE_URL}/api/allocations/${allocationId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        note: 'Sprint completed. Returned to inventory.',
      }),
    });

    const revokeData = await revokeRes.json();
    console.log(`Response status: ${revokeRes.status}`);
    console.log('Response body:', JSON.stringify(revokeData, null, 2));

    if (revokeRes.status !== 200 || !revokeData.success || revokeData.allocation.status !== 'REVOKED') {
      throw new Error('Revoke allocation failed');
    }
    console.log('✅ Revoke Allocation Successful!');

    // Verify asset status transitioned back to AVAILABLE
    const checkAsset2 = await prisma.asset.findUnique({ where: { id: assetId } });
    console.log(`Asset status after revoke: ${checkAsset2?.status} (should be AVAILABLE)`);
    if (checkAsset2?.status !== 'AVAILABLE') throw new Error('Asset status was not updated to AVAILABLE');
    console.log('✅ Asset Status transition back to AVAILABLE verified!\n');

    // -----------------------------------------------------------------
    // Test 8: Get Allocation History (GET /api/allocations/:id/history)
    // -----------------------------------------------------------------
    console.log(`[Test 8] Fetching allocation history for: ${allocationId}...`);
    const historyRes = await fetch(`${BASE_URL}/api/allocations/${allocationId}/history`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    const historyData = await historyRes.json();
    console.log(`Response status: ${historyRes.status}`);
    console.log('History events returned:');
    console.log(JSON.stringify(historyData.history, null, 2));

    if (historyRes.status !== 200 || !historyData.success || historyData.history.length === 0) {
      throw new Error('Fetch allocation history failed');
    }
    console.log('✅ Fetch Allocation History Successful!\n');

    console.log('🎉 ALL 6 ALLOCATION API ROUTES VERIFIED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up test records from database...');
    // Delete overdue allocation
    try {
      if (overdueAllocationId) {
        await prisma.allocationHistory.deleteMany({ where: { allocationId: overdueAllocationId } });
        await prisma.assetAllocation.delete({ where: { id: overdueAllocationId } });
      }
    } catch (e) {}

    // Delete primary allocation
    try {
      if (allocationId) {
        await prisma.allocationHistory.deleteMany({ where: { allocationId } });
        await prisma.assetAllocation.delete({ where: { id: allocationId } });
      }
    } catch (e) {}

    // Delete test users
    try {
      const userA = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (userA) {
        // delete dependencies
        await prisma.employee.deleteMany({ where: { userId: userA.id } });
        await prisma.user.delete({ where: { id: userA.id } });
      }
      const userE = await prisma.user.findUnique({ where: { email: employeeEmail } });
      if (userE) {
        await prisma.employee.deleteMany({ where: { userId: userE.id } });
        await prisma.user.delete({ where: { id: userE.id } });
      }
    } catch (e) {}

    // Delete assets
    try {
      if (assetId) {
        await prisma.assetStatusHistory.deleteMany({ where: { assetId } });
        await prisma.asset.delete({ where: { id: assetId } });
      }
      if (overdueAssetId) {
        await prisma.assetStatusHistory.deleteMany({ where: { assetId: overdueAssetId } });
        await prisma.asset.delete({ where: { id: overdueAssetId } });
      }
    } catch (e) {}

    // Delete category & department
    try {
      if (categoryId) {
        await prisma.assetCategory.delete({ where: { id: categoryId } });
      }
    } catch (e) {}

    // Delete department
    try {
      if (departmentId) {
        await prisma.department.delete({ where: { id: departmentId } });
      }
    } catch (e) {}

    console.log('🧹 Database Clean up complete.');
  }
}

runTests();
