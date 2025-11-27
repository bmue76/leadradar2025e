import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Erzeugt einen sicheren Hash aus einem Klartext-Passwort.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Vergleicht Klartext-Passwort mit gespeichertem Hash.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}
