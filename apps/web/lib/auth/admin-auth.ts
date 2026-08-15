import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";


const ADMIN_COOKIE_NAME = "cpl_admin_session";

// In-memory rate limiting map for login attempts per IP
// Map<ip, { attempts: number; lastAttempt: number; lockedUntil: number }>
const loginAttemptsMap = new Map<string, { attempts: number; lastAttempt: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Returns the secret admin entry path configured in environment.
 * Throws a safe configuration error if not configured.
 */
export function getAdminEntryPath(): string {
  const path = process.env.ADMIN_ENTRY_PATH;
  if (!path || !path.trim()) {
    throw new Error("ADMIN_ENTRY_PATH is not configured in server environment.");
  }
  // Sanitize leading/trailing slashes
  return path.trim().replace(/^\/+|\/+$/g, "");
}

/**
 * Verifies that required admin secrets are defined.
 */
function getAdminSecrets(): { password: string; secret: string } {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !password.trim()) {
    throw new Error("ADMIN_PASSWORD is not configured in server environment.");
  }
  if (!secret || !secret.trim()) {
    throw new Error("ADMIN_SESSION_SECRET is not configured in server environment.");
  }

  return { password: password.trim(), secret: secret.trim() };
}

/**
 * Creates a signed HMAC token for single admin session.
 */
function createSessionToken(): string {
  const { secret } = getAdminSecrets();
  const timestamp = Date.now();
  const payload = `PRIMARY_ADMIN:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

/**
 * Verifies the HMAC token signature and 24h freshness.
 */
function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const { secret } = getAdminSecrets();
    const parts = token.split(":");
    if (parts.length !== 3) return { valid: false };

    const [username, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return { valid: false };

    // Check 24-hour expiry
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    const payload = `${username}:${timestampStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: true, username };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Gets client IP address for rate-limiting.
 */
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") || "127.0.0.1";
}

/**
 * Checks and records rate-limiting for login attempts.
 */
async function checkRateLimit(): Promise<{ allowed: boolean; remainingMinutes?: number }> {
  const ip = await getClientIp();
  const now = Date.now();
  const record = loginAttemptsMap.get(ip);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes };
  }

  // Reset if last attempt was older than lockout window
  if (now - record.lastAttempt > LOCKOUT_DURATION_MS) {
    loginAttemptsMap.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

async function recordFailedAttempt(): Promise<void> {
  const ip = await getClientIp();
  const now = Date.now();
  const record = loginAttemptsMap.get(ip) || { attempts: 0, lastAttempt: now, lockedUntil: 0 };

  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttemptsMap.set(ip, record);
}

async function resetRateLimit(): Promise<void> {
  const ip = await getClientIp();
  loginAttemptsMap.delete(ip);
}

/**
 * Authenticates admin credentials and sets HttpOnly session cookie.
 */
export async function loginAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  const rateLimit = await checkRateLimit();
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many failed attempts. Access temporarily locked for ${rateLimit.remainingMinutes} minute(s).`,
    };
  }

  let adminPassword = "";
  try {
    const secrets = getAdminSecrets();
    adminPassword = secrets.password;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Server authentication configuration error.",
    };
  }

  if (password !== adminPassword) {
    await recordFailedAttempt();
    return { success: false, error: "Invalid credentials." };
  }

  // Reset rate limit on success
  await resetRateLimit();

  const token = createSessionToken();
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return { success: true };
}

/**
 * Logs out the admin by destroying the session cookie and redirecting to the secret entry page.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  const entryPath = getAdminEntryPath();
  redirect(`/${entryPath}`);
}

/**
 * Verifies if current request has a valid admin session.
 * Request-scoped via React cache to deduplicate layout/page checks within a single request.
 */
export const getAdminSession = cache(async (): Promise<{ authenticated: boolean; username?: string }> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return { authenticated: false };
  }

  const { valid, username } = verifySessionToken(sessionCookie.value);
  if (!valid) {
    return { authenticated: false };
  }

  return { authenticated: true, username: username || "PRIMARY_ADMIN" };
});


/**
 * Server-side guard that redirects unauthenticated requests to the secret admin entry page.
 */
export async function requireAdminAuth(): Promise<{ username: string }> {
  const session = await getAdminSession();
  if (!session.authenticated || !session.username) {
    const entryPath = getAdminEntryPath();
    redirect(`/${entryPath}`);
  }
  return { username: session.username };
}
