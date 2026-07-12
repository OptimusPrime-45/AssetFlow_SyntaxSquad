import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Returns Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  
  // Accounts info
  const adminEmail = `ret-admin-${randomId}@example.com`;
  const johnEmail = `ret-john-${randomId}@example.com`;
  const password = 'Password123!';

  let adminCookie = '';
  let johnCookie = '';
  
  let categoryId = '';
  let departmentId = '';
  let assetId = '';
  
  let johnEmpId = '';
  let allocationId = '';
  let returnRequestId = '';

  try {
    // -----------------------------------------------------------------
    // Setup: Create Category, Department directly
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Category and Department...');
    const dbCategory = await prisma.assetCategory.create({
      data: {
        name: `Return Category ${randomId}`,
        code: `CAT-RE-${randomId}`,
        description: 'Test category description',
      },
    });
    categoryId = dbCategory.id;

    const dbDepartment = await prisma.department.create({
      data: {
        name: `Return Department ${randomId}`,
        code: `DEPT-RE-${randomId}`,
        description: 'Test department description',
      },
    });
    departmentId = dbDepartment.id;

    // -----------------------------------------------------------------
    // Setup: Create Asset (initially AVAILABLE)
    // -----------------------------------------------------------------
    const dbAsset = await prisma.asset.create({
      data: {
        name: `Return Macbook Air ${randomId}`,
        categoryId,
        assetTag: `TAG-RE-${randomId}`,
        serialNumber: `SN-RE-${randomId}`,
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });
    assetId = dbAsset.id;
    console.log(`Setup complete. Asset: ${assetId}\n`);

    // -----------------------------------------------------------------
    // Setup: Register and Auth Admin Emma
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Emma Admin...');
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
    // Setup: Register and Auth John Employee
    // -----------------------------------------------------------------
    console.log('[Setup] Creating John Employee...');
    const signupJohnRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: johnEmail,
        password,
        firstName: 'John',
        lastName: 'Returned',
        departmentId,
      }),
    });
    const signupJohnData = await signupJohnRes.json();
    
    const dbJohnEmp = await prisma.employee.findFirst({
      where: { userId: signupJohnData.user.id },
    });
    if (!dbJohnEmp) throw new Error('John Employee registration failed');
    johnEmpId = dbJohnEmp.id;

    const loginJohnRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: johnEmail, password }),
    });
    johnCookie = loginJohnRes.headers.get('set-cookie')?.split(';')[0] || '';
    console.log(`John Returned authenticated. Employee ID: ${johnEmpId}.\n`);

    // -----------------------------------------------------------------
    // Setup: Allocate Asset to John (Emma Admin acts)
    // -----------------------------------------------------------------
    console.log('[Setup] Allocating asset to John Returned...');
    const allocRes = await fetch(`${BASE_URL}/api/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        assetId,
        allocatedToEmployeeId: johnEmpId,
      }),
    });
    const allocData = await allocRes.json();
    allocationId = allocData.allocation.id;
    console.log(`Asset allocated. Allocation ID: ${allocationId}. Asset status: ${allocData.allocation.asset.status}\n`);

    // -----------------------------------------------------------------
    // Test 1: Request Return (POST /api/returns)
    // -----------------------------------------------------------------
    console.log('[Test 1] John Returned requesting asset return...');
    const createRes = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        assetAllocationId: allocationId,
        conditionOnReturn: 'GOOD',
        conditionNotes: 'Small scratch on screen, but works fine.',
      }),
    });

    const createData = await createRes.json();
    console.log(`Response status: ${createRes.status}`);
    console.log('Response body:', JSON.stringify(createData, null, 2));

    if (createRes.status !== 201 || !createData.success) {
      throw new Error('Return request creation failed');
    }
    returnRequestId = createData.returnRequest.id;
    console.log('✅ Return request registered successfully!');

    // Verify John's allocation status is now RETURN_PENDING
    const checkAlloc = await prisma.assetAllocation.findUnique({ where: { id: allocationId } });
    console.log(`John allocation status: ${checkAlloc?.status} (should be RETURN_PENDING)`);
    if (checkAlloc?.status !== 'RETURN_PENDING') throw new Error('Allocation status not updated');
    console.log('✅ Allocation status transition verified!\n');

    // -----------------------------------------------------------------
    // Test 2: Get Return details (GET /api/returns/:id)
    // -----------------------------------------------------------------
    console.log(`[Test 2] Fetching return request details by ID: ${returnRequestId}...`);
    const detailsRes = await fetch(`${BASE_URL}/api/returns/${returnRequestId}`, {
      method: 'GET',
      headers: { Cookie: johnCookie },
    });

    const detailsData = await detailsRes.json();
    console.log(`Response status: ${detailsRes.status}`);
    
    if (detailsRes.status !== 200 || !detailsData.success || detailsData.returnRequest.id !== returnRequestId) {
      throw new Error('Get return request details failed');
    }
    console.log('✅ Get Return request details Successful!\n');

    // -----------------------------------------------------------------
    // Test 3: List Return Requests (GET /api/returns)
    // -----------------------------------------------------------------
    console.log('[Test 3] Fetching return requests list...');
    const listRes = await fetch(`${BASE_URL}/api/returns?assetAllocationId=${allocationId}`, {
      method: 'GET',
      headers: { Cookie: johnCookie },
    });

    const listData = await listRes.json();
    console.log(`Response status: ${listRes.status}`);
    console.log(`Requests found: ${listData.returns?.length || 0}`);

    if (listRes.status !== 200 || !listData.success) {
      throw new Error('List return requests failed');
    }
    console.log('✅ List Return requests Successful!\n');

    // -----------------------------------------------------------------
    // Test 4: Reject Return (POST /api/returns/:id/reject)
    // -----------------------------------------------------------------
    console.log(`[Test 4] Emma Admin rejecting return: ${returnRequestId}...`);
    const rejectRes = await fetch(`${BASE_URL}/api/returns/${returnRequestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        note: 'Rejecting: Inspection notes conflict with registered condition.',
      }),
    });

    const rejectData = await rejectRes.json();
    console.log(`Response status: ${rejectRes.status}`);
    console.log('Response body:', JSON.stringify(rejectData, null, 2));

    if (rejectRes.status !== 200 || !rejectData.success || rejectData.returnRequest.status !== 'REJECTED') {
      throw new Error('Reject return failed');
    }
    console.log('✅ Reject Return Successful!');

    // Verify John's allocation status reverted back to ACTIVE
    const checkAllocAfterReject = await prisma.assetAllocation.findUnique({ where: { id: allocationId } });
    console.log(`John allocation status: ${checkAllocAfterReject?.status} (should be ACTIVE)`);
    if (checkAllocAfterReject?.status !== 'ACTIVE') throw new Error('Allocation status was not reverted to ACTIVE');
    console.log('✅ Allocation status reversion verified!\n');

    // -----------------------------------------------------------------
    // Test 5: Approve Return (POST /api/returns/:id/approve)
    // -----------------------------------------------------------------
    console.log('[Test 5] Re-requesting and approving return request with DAMAGED condition...');
    // Create direct Prisma record for bypass since we deleted/rejected the old request
    // and we need to create a new return request for the same allocation
    await prisma.assetReturn.delete({ where: { id: returnRequestId } });
    
    // Request again
    const createRes2 = await fetch(`${BASE_URL}/api/returns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        assetAllocationId: allocationId,
        conditionOnReturn: 'FAIR',
        conditionNotes: 'A bit worn out.',
      }),
    });
    const createData2 = await createRes2.json();
    const finalReturnId = createData2.returnRequest.id;

    // Approve it (by Emma) with condition overridden to DAMAGED
    const approveRes = await fetch(`${BASE_URL}/api/returns/${finalReturnId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        conditionOnReturn: 'DAMAGED',
        inspectionNotes: 'Liquid damage detected near keyboard. Handed to repairs.',
      }),
    });

    const approveData = await approveRes.json();
    console.log(`Approve Response status: ${approveRes.status}`);
    console.log('Approve Response body:', JSON.stringify(approveData, null, 2));

    if (approveRes.status !== 200 || !approveData.success || approveData.returnRequest.status !== 'APPROVED') {
      throw new Error('Approve return request failed');
    }
    console.log('✅ Approve Return Successful!');

    // Verify Asset status is AVAILABLE and condition updated to DAMAGED
    const checkAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    console.log(`Asset status: ${checkAsset?.status} (should be AVAILABLE)`);
    console.log(`Asset condition: ${checkAsset?.condition} (should be DAMAGED)`);
    if (checkAsset?.status !== 'AVAILABLE' || checkAsset?.condition !== 'DAMAGED') {
      throw new Error('Asset status/condition updates failed');
    }
    console.log('✅ Asset details updated correctly!');

    // Verify Allocation is returned/inactive
    const checkAllocFinal = await prisma.assetAllocation.findUnique({ where: { id: allocationId } });
    console.log(`Allocation current status: ${checkAllocFinal?.status} (should be RETURNED)`);
    console.log(`Allocation isCurrent: ${checkAllocFinal?.isCurrent} (should be false)`);
    if (checkAllocFinal?.status !== 'RETURNED' || checkAllocFinal?.isCurrent) {
      throw new Error('Allocation deactivation failed');
    }
    console.log('✅ Allocation deactivated successfully!\n');

    console.log('🎉 ALL 4 RETURN API ROUTES VERIFIED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up test records from database...');
    // Delete return requests
    try {
      await prisma.assetReturn.deleteMany({
        where: { assetAllocationId: allocationId },
      });
    } catch (e) {}

    // Delete allocations
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
        await prisma.employee.deleteMany({ where: { userId: userA.id } });
        await prisma.user.delete({ where: { id: userA.id } });
      }
      const userJ = await prisma.user.findUnique({ where: { email: johnEmail } });
      if (userJ) {
        await prisma.employee.deleteMany({ where: { userId: userJ.id } });
        await prisma.user.delete({ where: { id: userJ.id } });
      }
    } catch (e) {}

    // Delete asset
    try {
      if (assetId) {
        await prisma.assetStatusHistory.deleteMany({ where: { assetId } });
        await prisma.asset.delete({ where: { id: assetId } });
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
