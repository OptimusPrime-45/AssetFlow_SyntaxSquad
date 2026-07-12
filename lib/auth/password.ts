import bcrypt from 'bcryptjs';

/**
 * Hashes a plain text password using bcryptjs.
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plain text password against a hashed password.
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if password matches the hash, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
