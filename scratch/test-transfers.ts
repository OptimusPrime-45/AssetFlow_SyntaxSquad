import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Transfers Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  
  // Accounts info
  const adminEmail = `trans-admin-${randomId}@example.com`;
  const johnEmail = `trans-john-${randomId}@example.com`;
  const sarahEmail = `trans-sarah-${randomId}@example.com`;
  const password = 'Password123!';

  let adminCookie = '';
  let johnCookie = '';
  
  let categoryId = '';
  let departmentId = '';
  let assetId = '';
  
  let johnEmpId = '';
  let sarahEmpId = '';
  
  let johnAllocationId = '';
  let sarahAllocationId = '';
  let transferId = '';

  try {
    // -----------------------------------------------------------------
    // Setup: Create Category, Department directly
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Category and Department...');
    const dbCategory = await prisma.assetCategory.create({
      data: {
        name: `Transfer Category ${randomId}`,
        code: `CAT-TR-${randomId}`,
        description: 'Test category description',
      },
    });
    categoryId = dbCategory.id;

    const dbDepartment = await prisma.department.create({
      data: {
        name: `Transfer Department ${randomId}`,
        code: `DEPT-TR-${randomId}`,
        description: 'Test department description',
      },
    });
    departmentId = dbDepartment.id;

    // -----------------------------------------------------------------
    // Setup: Create Asset (initially AVAILABLE)
    // -----------------------------------------------------------------
    const dbAsset = await prisma.asset.create({
      data: {
        name: `Transfer Lenovo ThinkPad ${randomId}`,
        categoryId,
        assetTag: `TAG-TR-${randomId}`,
        serialNumber: `SN-TR-${randomId}`,
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
        lastName: 'Sender',
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
    console.log(`John Sender authenticated. Employee ID: ${johnEmpId}.`);

    // -----------------------------------------------------------------
    // Setup: Register Sarah Employee
    // -----------------------------------------------------------------
    console.log('[Setup] Creating Sarah Employee...');
    const signupSarahRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sarahEmail,
        password,
        firstName: 'Sarah',
        lastName: 'Receiver',
        departmentId,
      }),
    });
    const signupSarahData = await signupSarahRes.json();
    
    const dbSarahEmp = await prisma.employee.findFirst({
      where: { userId: signupSarahData.user.id },
    });
    if (!dbSarahEmp) throw new Error('Sarah Employee registration failed');
    sarahEmpId = dbSarahEmp.id;
    console.log(`Sarah Receiver registered. Employee ID: ${sarahEmpId}.\n`);

    // -----------------------------------------------------------------
    // Setup: Allocate Asset to John (Emma Admin acts)
    // -----------------------------------------------------------------
    console.log('[Setup] Allocating asset to John Sender...');
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
    johnAllocationId = allocData.allocation.id;
    console.log(`Asset allocated. Allocation ID: ${johnAllocationId}. Asset status: ${allocData.allocation.asset.status}\n`);

    // -----------------------------------------------------------------
    // Test 1: Request Transfer (POST /api/transfers)
    // -----------------------------------------------------------------
    console.log('[Test 1] John Sender requesting transfer of asset to Sarah...');
    const createRes = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        assetId,
        toEmployeeId: sarahEmpId,
        reason: 'Swapping roles for the frontend module development',
      }),
    });

    const createData = await createRes.json();
    console.log(`Response status: ${createRes.status}`);
    console.log('Response body:', JSON.stringify(createData, null, 2));

    if (createRes.status !== 201 || !createData.success) {
      throw new Error('Transfer request creation failed');
    }
    transferId = createData.transfer.id;
    console.log('✅ Transfer request registered successfully!');

    // Verify John's allocation status is now TRANSFER_PENDING
    const checkAlloc = await prisma.assetAllocation.findUnique({ where: { id: johnAllocationId } });
    console.log(`John allocation status: ${checkAlloc?.status} (should be TRANSFER_PENDING)`);
    if (checkAlloc?.status !== 'TRANSFER_PENDING') throw new Error('Allocation status not updated');
    console.log('✅ Allocation status transition verified!\n');

    // -----------------------------------------------------------------
    // Test 2: Get Transfer details (GET /api/transfers/:id)
    // -----------------------------------------------------------------
    console.log(`[Test 2] Fetching transfer details by ID: ${transferId}...`);
    const detailsRes = await fetch(`${BASE_URL}/api/transfers/${transferId}`, {
      method: 'GET',
      headers: { Cookie: johnCookie },
    });

    const detailsData = await detailsRes.json();
    console.log(`Response status: ${detailsRes.status}`);
    
    if (detailsRes.status !== 200 || !detailsData.success || detailsData.transfer.id !== transferId) {
      throw new Error('Get transfer details failed');
    }
    console.log('✅ Get Transfer details Successful!\n');

    // -----------------------------------------------------------------
    // Test 3: List Transfer Requests (GET /api/transfers)
    // -----------------------------------------------------------------
    console.log('[Test 3] Fetching transfers list...');
    const listRes = await fetch(`${BASE_URL}/api/transfers?assetId=${assetId}`, {
      method: 'GET',
      headers: { Cookie: johnCookie },
    });

    const listData = await listRes.json();
    console.log(`Response status: ${listRes.status}`);
    console.log(`Requests found: ${listData.transfers?.length || 0}`);

    if (listRes.status !== 200 || !listData.success) {
      throw new Error('List transfer requests failed');
    }
    console.log('✅ List Transfer requests Successful!\n');

    // -----------------------------------------------------------------
    // Test 4: Reject Transfer (POST /api/transfers/:id/reject)
    // -----------------------------------------------------------------
    console.log(`[Test 4] Emma Admin rejecting transfer: ${transferId}...`);
    const rejectRes = await fetch(`${BASE_URL}/api/transfers/${transferId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        note: 'Rejecting: Modules must be completed by original assignees first.',
      }),
    });

    const rejectData = await rejectRes.json();
    console.log(`Response status: ${rejectRes.status}`);
    console.log('Response body:', JSON.stringify(rejectData, null, 2));

    if (rejectRes.status !== 200 || !rejectData.success || rejectData.transfer.status !== 'REJECTED') {
      throw new Error('Reject transfer failed');
    }
    console.log('✅ Reject Transfer Successful!');

    // Verify John's allocation status reverted back to ACTIVE
    const checkAllocAfterReject = await prisma.assetAllocation.findUnique({ where: { id: johnAllocationId } });
    console.log(`John allocation status: ${checkAllocAfterReject?.status} (should be ACTIVE)`);
    if (checkAllocAfterReject?.status !== 'ACTIVE') throw new Error('Allocation status was not reverted to ACTIVE');
    console.log('✅ Allocation status reversion verified!\n');

    // -----------------------------------------------------------------
    // Test 5: Cancel Transfer (POST /api/transfers/:id/cancel)
    // -----------------------------------------------------------------
    console.log('[Test 5] Re-requesting transfer and cancelling it...');
    // Request again
    const createRes2 = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        assetId,
        toEmployeeId: sarahEmpId,
        reason: 'Swap roles again',
      }),
    });
    const createData2 = await createRes2.json();
    const secondTransferId = createData2.transfer.id;
    console.log(`New Transfer request created: ${secondTransferId}`);

    // Cancel it (by John)
    const cancelRes = await fetch(`${BASE_URL}/api/transfers/${secondTransferId}/cancel`, {
      method: 'POST',
      headers: { Cookie: johnCookie },
    });

    const cancelData = await cancelRes.json();
    console.log(`Cancel Response status: ${cancelRes.status}`);
    console.log(`Cancel Response body status: ${cancelData.transfer?.status}`);

    if (cancelRes.status !== 200 || !cancelData.success || cancelData.transfer.status !== 'CANCELLED') {
      throw new Error('Cancel transfer request failed');
    }
    
    // Verify allocation reverted back to ACTIVE
    const checkAllocAfterCancel = await prisma.assetAllocation.findUnique({ where: { id: johnAllocationId } });
    if (checkAllocAfterCancel?.status !== 'ACTIVE') throw new Error('Allocation did not revert after cancel');
    console.log('✅ Cancel Transfer Successful!\n');

    // -----------------------------------------------------------------
    // Test 6: Approve Transfer (POST /api/transfers/:id/approve)
    // -----------------------------------------------------------------
    console.log('[Test 6] Re-requesting and approving transfer...');
    // Request again
    const createRes3 = await fetch(`${BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: johnCookie,
      },
      body: JSON.stringify({
        assetId,
        toEmployeeId: sarahEmpId,
        reason: 'Confirming swap.',
      }),
    });
    const createData3 = await createRes3.json();
    const finalTransferId = createData3.transfer.id;

    // Approve it (by Emma)
    const approveRes = await fetch(`${BASE_URL}/api/transfers/${finalTransferId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        note: 'Approved by Emma Admin.',
      }),
    });

    const approveData = await approveRes.json();
    console.log(`Approve Response status: ${approveRes.status}`);
    console.log(`Approve Response body status: ${approveData.transfer?.status}`);

    if (approveRes.status !== 200 || !approveData.success || approveData.transfer.status !== 'APPROVED') {
      throw new Error('Approve transfer request failed');
    }
    console.log('✅ Approve Transfer Successful!\n');

    // -----------------------------------------------------------------
    // Test 7: Complete Transfer (POST /api/transfers/:id/complete)
    // -----------------------------------------------------------------
    console.log(`[Test 7] Completing transfer request: ${finalTransferId}...`);
    const completeRes = await fetch(`${BASE_URL}/api/transfers/${finalTransferId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        note: 'Swap completed. Handover confirmed.',
      }),
    });

    const completeData = await completeRes.json();
    console.log(`Response status: ${completeRes.status}`);
    console.log('Response body:', JSON.stringify(completeData, null, 2));

    if (completeRes.status !== 200 || !completeData.success || completeData.transfer.status !== 'COMPLETED') {
      throw new Error('Complete transfer failed');
    }
    console.log('✅ Complete Transfer Successful!');

    // Verify swap database rows
    // John allocation: status TRANSFERRED, isCurrent false
    const oldAlloc = await prisma.assetAllocation.findUnique({ where: { id: johnAllocationId } });
    console.log(`John old allocation status: ${oldAlloc?.status} (should be TRANSFERRED)`);
    console.log(`John old allocation current flag: ${oldAlloc?.isCurrent} (should be false)`);

    // Sarah allocation: should exist, status ACTIVE, isCurrent true
    const newAlloc = await prisma.assetAllocation.findFirst({
      where: { assetId, isCurrent: true, isDeleted: false },
    });
    console.log(`Sarah new allocation found ID: ${newAlloc?.id}`);
    console.log(`Sarah new allocation holder ID: ${newAlloc?.allocatedToEmployeeId} (should be Sarah ID: ${sarahEmpId})`);
    
    if (oldAlloc?.status !== 'TRANSFERRED' || oldAlloc?.isCurrent || !newAlloc || newAlloc.allocatedToEmployeeId !== sarahEmpId) {
      throw new Error('Allocation swap validation failed');
    }
    sarahAllocationId = newAlloc.id;
    console.log('✅ Allocation Swap verified successfully!\n');

    console.log('🎉 ALL 6 TRANSFER API ROUTES VERIFIED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    console.log('\n🧹 Cleaning up test records from database...');
    // Delete transfers
    try {
      await prisma.assetTransferRequest.deleteMany({
        where: { assetId },
      });
    } catch (e) {}

    // Delete allocations
    try {
      if (johnAllocationId) {
        await prisma.allocationHistory.deleteMany({ where: { allocationId: johnAllocationId } });
        await prisma.assetAllocation.delete({ where: { id: johnAllocationId } });
      }
      if (sarahAllocationId) {
        await prisma.allocationHistory.deleteMany({ where: { allocationId: sarahAllocationId } });
        await prisma.assetAllocation.delete({ where: { id: sarahAllocationId } });
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
      const userS = await prisma.user.findUnique({ where: { email: sarahEmail } });
      if (userS) {
        await prisma.employee.deleteMany({ where: { userId: userS.id } });
        await prisma.user.delete({ where: { id: userS.id } });
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
