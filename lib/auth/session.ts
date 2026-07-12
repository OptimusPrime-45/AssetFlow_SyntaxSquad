import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY_DAYS = 7;

function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a database session for a user.
 * @param userId User's database ID
 * @param headersList Optional Headers object to extract IP and user agent
 */
export async function createSession(userId: string, headersList?: Headers) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (headersList) {
    ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() || headersList.get('x-real-ip') || null;
    userAgent = headersList.get('user-agent') || null;
  }

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { session, token: rawToken };
}

/**
 * Verifies the current session via cookie.
 * Returns the session and user if valid, or null.
 */
export async function verifySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!session) return null;

  // Check expiration or revocation
  if (session.expiresAt < new Date() || session.revokedAt) {
    return null;
  }

  // Only a fully ACTIVE account may hold a session. Checking for ACTIVE rather
  // than listing the bad statuses means deactivating a user (INACTIVE) or
  // terminating them (SUSPENDED) kills their live sessions on the next request,
  // instead of letting them work until the 7-day cookie expires.
  if (session.user.isDeleted || session.user.status !== 'ACTIVE') {
    return null;
  }

  return {
    session,
    user: session.user,
  };
}

/**
 * Revokes a session by hashing the raw token and setting revokedAt.
 */
export async function destroySession(token: string) {
  const tokenHash = sha256(token);
  try {
    await prisma.session.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  } catch (e) {
    // Session might not exist or already be revoked/deleted
  }
}

/**
 * Sets the session cookie in response headers.
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Deletes the session cookie.
 */
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
