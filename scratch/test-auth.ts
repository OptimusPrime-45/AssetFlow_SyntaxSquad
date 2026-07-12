import { prisma } from '@/lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Authentication Endpoints Verification Tests...\n');

  const randomId = Math.floor(Math.random() * 10000);
  const email = `test-user-${randomId}@example.com`;
  const password = 'Password123!';
  const employeeCode = `EMP-${randomId}`;
  const firstName = 'Jane';
  const lastName = 'Doe';

  let verificationToken = '';
  let sessionCookie = '';
  let resetToken = '';
  let activeSessions: any[] = [];
  let currentSessionId = '';

  try {
    // -----------------------------------------------------------------
    // Test 1: Sign Up (POST /api/auth/signup)
    // -----------------------------------------------------------------
    console.log(`[Test 1] Signing up user: ${email}...`);
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        employeeCode,
        phone: '1234567890',
        designation: 'Engineer',
      }),
    });
    
    const signupData = await signupRes.json();
    console.log(`Response status: ${signupRes.status}`);
    console.log('Response body:', JSON.stringify(signupData, null, 2));

    if (signupRes.status !== 201 || !signupData.success) {
      throw new Error('Signup failed');
    }
    verificationToken = signupData.verificationToken;
    console.log('✅ Signup Successful!\n');

    // -----------------------------------------------------------------
    // Test 2: Login before verification (POST /api/auth/login)
    // -----------------------------------------------------------------
    console.log('[Test 2] Logging in before email verification (should succeed but user status is pending)...');
    const preLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const preLoginData = await preLoginRes.json();
    console.log(`Response status: ${preLoginRes.status}`);
    console.log('Response body:', JSON.stringify(preLoginData, null, 2));
    
    if (preLoginRes.status !== 200 || preLoginData.user.status !== 'PENDING_VERIFICATION') {
      throw new Error('Login behavior before verification is unexpected');
    }
    console.log('✅ Pre-verification Login check passed!\n');

    // -----------------------------------------------------------------
    // Test 3: Email Verification (POST /api/auth/verify-email)
    // -----------------------------------------------------------------
    console.log('[Test 3] Verifying email with token...');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
    });

    const verifyData = await verifyRes.json();
    console.log(`Response status: ${verifyRes.status}`);
    console.log('Response body:', JSON.stringify(verifyData, null, 2));

    if (verifyRes.status !== 200 || !verifyData.success) {
      throw new Error('Email verification failed');
    }
    console.log('✅ Email Verified Successful!\n');

    // -----------------------------------------------------------------
    // Test 4: Login after verification (POST /api/auth/login)
    // -----------------------------------------------------------------
    console.log('[Test 4] Logging in after email verification...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();
    console.log(`Response status: ${loginRes.status}`);
    console.log('Response body:', JSON.stringify(loginData, null, 2));

    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (loginRes.status !== 200 || !loginData.success || !setCookieHeader) {
      throw new Error('Login failed or did not set cookie');
    }

    // Extract cookie
    sessionCookie = setCookieHeader.split(';')[0];
    console.log(`Extracted Session Cookie: ${sessionCookie}`);
    console.log('✅ Login Successful!\n');

    // -----------------------------------------------------------------
    // Test 5: Fetch Profile (GET /api/auth/me)
    // -----------------------------------------------------------------
    console.log('[Test 5] Fetching profile with session cookie...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });

    const meData = await meRes.json();
    console.log(`Response status: ${meRes.status}`);
    console.log('Response body:', JSON.stringify(meData, null, 2));

    if (meRes.status !== 200 || !meData.success || meData.user.email !== email) {
      throw new Error('Fetch profile failed');
    }
    console.log('✅ Fetch Profile Successful!\n');

    // -----------------------------------------------------------------
    // Test 6: Change Password (POST /api/auth/change-password)
    // -----------------------------------------------------------------
    const newPassword = 'NewPassword999!';
    console.log('[Test 6] Changing password...');
    const changePassRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: password,
        newPassword,
      }),
    });

    const changePassData = await changePassRes.json();
    console.log(`Response status: ${changePassRes.status}`);
    console.log('Response body:', JSON.stringify(changePassData, null, 2));

    if (changePassRes.status !== 200 || !changePassData.success) {
      throw new Error('Change password failed');
    }
    console.log('✅ Change Password Successful!\n');

    // -----------------------------------------------------------------
    // Test 7: Verify login with new password (POST /api/auth/login)
    // -----------------------------------------------------------------
    console.log('[Test 7] Verifying new password by logging in again...');
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    });

    const newLoginData = await newLoginRes.json();
    console.log(`Response status: ${newLoginRes.status}`);

    const newSetCookieHeader = newLoginRes.headers.get('set-cookie');
    if (newLoginRes.status !== 200 || !newLoginData.success || !newSetCookieHeader) {
      throw new Error('Login with new password failed');
    }

    // Keep the new session cookie for subsequent requests
    const secondaryCookie = newSetCookieHeader.split(';')[0];
    console.log('✅ Login with new password Successful!\n');

    // -----------------------------------------------------------------
    // Test 8: Get Sessions (GET /api/auth/sessions)
    // -----------------------------------------------------------------
    console.log('[Test 8] Fetching active sessions...');
    const sessionsRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
      method: 'GET',
      headers: { Cookie: secondaryCookie },
    });

    const sessionsData = await sessionsRes.json();
    console.log(`Response status: ${sessionsRes.status}`);
    console.log('Response body:', JSON.stringify(sessionsData, null, 2));

    if (sessionsRes.status !== 200 || !sessionsData.success) {
      throw new Error('Fetch sessions failed');
    }
    activeSessions = sessionsData.sessions;
    currentSessionId = activeSessions.find(s => s.isCurrent)?.id;
    console.log('✅ Fetch Sessions Successful!\n');

    // -----------------------------------------------------------------
    // Test 9: Revoke Session (DELETE /api/auth/sessions/:id)
    // -----------------------------------------------------------------
    console.log(`[Test 9] Revoking current session: ${currentSessionId}...`);
    const deleteSessionRes = await fetch(`${BASE_URL}/api/auth/sessions/${currentSessionId}`, {
      method: 'DELETE',
      headers: { Cookie: secondaryCookie },
    });

    const deleteSessionData = await deleteSessionRes.json();
    console.log(`Response status: ${deleteSessionRes.status}`);
    console.log('Response body:', JSON.stringify(deleteSessionData, null, 2));

    if (deleteSessionRes.status !== 200 || !deleteSessionData.success || !deleteSessionData.loggedOut) {
      throw new Error('Revoke session failed');
    }
    console.log('✅ Revoke Session Successful!\n');

    // -----------------------------------------------------------------
    // Test 10: Forgot Password (POST /api/auth/forgot-password)
    // -----------------------------------------------------------------
    console.log('[Test 10] Triggering Forgot Password...');
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const forgotData = await forgotRes.json();
    console.log(`Response status: ${forgotRes.status}`);
    console.log('Response body:', JSON.stringify(forgotData, null, 2));

    if (forgotRes.status !== 200 || !forgotData.success) {
      throw new Error('Forgot password request failed');
    }
    resetToken = forgotData.resetToken;
    console.log('✅ Forgot Password request Successful!\n');

    // -----------------------------------------------------------------
    // Test 11: Reset Password (POST /api/auth/reset-password)
    // -----------------------------------------------------------------
    const finalPassword = 'FinalPassword123!';
    console.log('[Test 11] Resetting password using token...');
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: finalPassword,
      }),
    });

    const resetData = await resetRes.json();
    console.log(`Response status: ${resetRes.status}`);
    console.log('Response body:', JSON.stringify(resetData, null, 2));

    if (resetRes.status !== 200 || !resetData.success) {
      throw new Error('Reset password failed');
    }
    console.log('✅ Reset Password Successful!\n');

    // -----------------------------------------------------------------
    // Test 12: Verify final login (POST /api/auth/login)
    // -----------------------------------------------------------------
    console.log('[Test 12] Logging in with final reset password...');
    const finalLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: finalPassword }),
    });

    const finalLoginData = await finalLoginRes.json();
    console.log(`Response status: ${finalLoginRes.status}`);

    const finalSetCookieHeader = finalLoginRes.headers.get('set-cookie');
    if (finalLoginRes.status !== 200 || !finalLoginData.success || !finalSetCookieHeader) {
      throw new Error('Login with reset password failed');
    }
    const finalCookie = finalSetCookieHeader.split(';')[0];
    console.log('✅ Final Login Successful!\n');

    // -----------------------------------------------------------------
    // Test 13: Logout (POST /api/auth/logout)
    // -----------------------------------------------------------------
    console.log('[Test 13] Logging out...');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: finalCookie },
    });

    const logoutData = await logoutRes.json();
    console.log(`Response status: ${logoutRes.status}`);
    console.log('Response body:', JSON.stringify(logoutData, null, 2));

    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error('Logout failed');
    }
    console.log('✅ Logout Successful!\n');

    // -----------------------------------------------------------------
    // Test 14: Profile check after Logout (should fail)
    // -----------------------------------------------------------------
    console.log('[Test 14] Fetching profile after logout (should fail with 401)...');
    const postLogoutMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { Cookie: finalCookie },
    });

    const postLogoutMeData = await postLogoutMeRes.json();
    console.log(`Response status: ${postLogoutMeRes.status}`);
    console.log('Response body:', JSON.stringify(postLogoutMeData, null, 2));

    if (postLogoutMeRes.status !== 401 || postLogoutMeData.success) {
      throw new Error('Me profile should be protected after logout');
    }
    console.log('✅ Profile protection after Logout Successful!\n');

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! AUTHENTICATION CONFORMS TO PROTOCOLS.');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Clean up created user in database to keep database clean
    console.log(`🧹 Cleaning up test user: ${email}...`);
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
        console.log('🧹 Clean up complete.');
      }
    } catch (e) {
      console.error('Failed to clean up test user:', e);
    }
  }
}

runTests();
