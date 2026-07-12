import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'some-secure-default-secret-key-12345';

/**
 * Generates an email verification token signed using HMAC-SHA256.
 * The token format is: userId:expiresAt:signature
 * @param userId ID of the user
 * @param expiresInMs Expiration duration in milliseconds (default 24 hours)
 */
export function generateVerificationToken(userId: string, expiresInMs: number = 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${userId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Verifies a state-free email verification token.
 * @param token The raw token string
 * @returns The userId if the token is valid and not expired, null otherwise
 */
export function verifyVerificationToken(token: string): string | null {
  try {
    if (!token) return null;
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || expiresAt < Date.now()) return null;

    const payload = `${userId}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}
