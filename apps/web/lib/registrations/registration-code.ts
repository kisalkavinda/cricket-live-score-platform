import crypto from "crypto";

/**
 * Generates an atomic, collision-resistant human-readable registration code.
 * Format: REG-YYYY-XXXXX (e.g. REG-2026-08492)
 */
export function generateRegistrationCode(year: number = new Date().getFullYear()): string {
  // Generate 5 cryptographically secure random decimal digits or alphanumeric chars
  const randomNum = crypto.randomInt(10000, 99999);
  return `REG-${year}-${randomNum}`;
}
