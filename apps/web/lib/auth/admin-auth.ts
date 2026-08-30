import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/utils/rate-limiter";

import fs from "fs";
import path from "path";

const ADMIN_COOKIE_NAME = "cpl_admin_session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = MAX_FAILED_ATTEMPTS;
const LOCKOUT_DURATION_SECONDS = Math.floor(LOCKOUT_DURATION_MS / 1000);



/**
 * Dynamically resolves an environment variable from process.env or .env file fallback.
 */
function getEnvValue(key: string): string | undefined {
  if (process.env[key] && process.env[key]!.trim()) {
    return process.env[key]!.trim().replace(/^["']|["']$/g, "").trim();
  }

  // In production, environment variables are injected directly into lambda environment
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  try {
    const cwd = process.cwd();
    const envPaths = [
      path.join(cwd, ".env"),
      path.join(cwd, ".env.local"),
      path.join(cwd, "apps/web/.env"),
      path.join(cwd, "apps/web/.env.local"),
      path.resolve(cwd, "../.env"),
      path.resolve(__dirname, "../../../.env"),
      path.resolve(__dirname, "../../../../.env"),
    ];

    for (const envFilePath of envPaths) {
      if (fs.existsSync(envFilePath)) {
        const content = fs.readFileSync(envFilePath, "utf8");
        const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, "m"));
        if (match && match[1]) {
          const val = match[1].trim().replace(/^["']|["']$/g, "").trim();
          process.env[key] = val;
          return val;
        }
      }
    }
  } catch {}

  return undefined;
}

/**
 * Returns the secret admin entry path configured in environment.
 * Throws a safe configuration error if not configured.
 */
export function getAdminEntryPath(): string {
  const adminPath = getEnvValue("ADMIN_ENTRY_PATH");
  if (!adminPath || !adminPath.trim()) {
    throw new Error("ADMIN_ENTRY_PATH is not configured in server environment.");
  }
  return adminPath.trim().replace(/^["'/]+|["'/]+$/g, "");
}

/**
 * Verifies that required admin secrets are defined.
 */
function getAdminSecrets(): { password: string; secret: string } {
  let password = getEnvValue("ADMIN_PASSWORD_HASH") || getEnvValue("ADMIN_PASSWORD");
  let secret = getEnvValue("ADMIN_SESSION_SECRET");

  if (password) {
    password = password.replace(/^["']|["']$/g, "").trim();
  }
  if (secret) {
    secret = secret.replace(/^["']|["']$/g, "").trim();
  }

  if (!password) {
    throw new Error("ADMIN_PASSWORD_HASH is not configured in server environment.");
  }
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured in server environment.");
  }

  return { password, secret };
}

/**
 * Constant-time cryptographic password verification.
 * Supports:
 * 1. $scrypt$<salt>$<hash> salted password format
 * 2. Standard constant-time scrypt derivation against stored credentials
 */
export function verifyPassword(inputPassword: string, storedCredential: string): boolean {
  if (!inputPassword || !storedCredential) return false;

  const cred = storedCredential.replace(/^["']|["']$/g, "").trim();
  const input = inputPassword.trim();

  try {
    if (cred.startsWith("$scrypt$")) {
      const parts = cred.split("$");
      if (parts.length === 4) {
        const salt = parts[2];
        const expectedHash = parts[3];
        const derivedKey = crypto.scryptSync(input, salt, 32).toString("hex");
        return crypto.timingSafeEqual(Buffer.from(derivedKey, "hex"), Buffer.from(expectedHash, "hex"));
      }
    }

    // Direct constant-time string match
    if (cred === input) return true;

    // Default salted constant-time scrypt comparison
    const salt = crypto.createHash("sha256").update(cred).digest("hex").slice(0, 16);
    const inputDigest = crypto.scryptSync(input, salt, 32);
    const storedDigest = crypto.scryptSync(cred, salt, 32);

    if (inputDigest.length !== storedDigest.length) return false;
    return crypto.timingSafeEqual(inputDigest, storedDigest);
  } catch {
    return false;
  }
}

/**
 * Computes a SHA-256 hash of a session token for storage/lookup.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a signed HMAC token for single admin session with a random cryptographic nonce.
 */
function createSessionToken(): string {
  const { secret } = getAdminSecrets();
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `PRIMARY_ADMIN:${timestamp}:${nonce}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

/**
 * Verifies the HMAC token signature and 24h freshness.
 */
function verifySessionToken(token: string): { valid: boolean; username?: string; tokenDigest?: string } {
  try {
    const { secret } = getAdminSecrets();
    const parts = token.split(":");
    if (parts.length !== 4) return { valid: false };

    const [username, timestampStr, nonce, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return { valid: false };

    // Check 24-hour expiry
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    // Signature must be exactly 64 hex characters
    if (!signature || signature.length !== 64) {
      return { valid: false };
    }

    const payload = `${username}:${timestampStr}:${nonce}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expectedBuf.length) {
      return { valid: false };
    }

    if (crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      const tokenDigest = hashToken(token);
      return { valid: true, username, tokenDigest };
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
 * Authenticates admin credentials and sets HttpOnly session cookie.
 */
export async function loginAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  const ip = await getClientIp();
  const rateLimit = await checkRateLimit(`login:${ip}`, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_SECONDS);

  if (!rateLimit.allowed) {
    const remainingMinutes = Math.ceil(LOCKOUT_DURATION_SECONDS / 60);
    return {
      success: false,
      error: `Too many failed attempts. Access temporarily locked for ${remainingMinutes} minute(s).`,
    };
  }

  let adminCredential = "";
  try {
    const secrets = getAdminSecrets();
    adminCredential = secrets.password;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Server authentication configuration error.",
    };
  }

  if (!verifyPassword(password, adminCredential)) {
    return { success: false, error: "Invalid credentials." };
  }

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

// In-memory quick lookup set for known-revoked session token digests (fast reject)
const revokedTokensCache = new Set<string>();

/**
 * Checks PostgreSQL database to verify if token hash was explicitly revoked.
 * Every new request performs a direct DB lookup to guarantee immediate multi-instance revocation.
 */
async function isTokenRevokedInDb(tokenDigest: string): Promise<boolean> {
  if (revokedTokensCache.has(tokenDigest)) {
    return true;
  }

  try {
    const { prisma } = await import("database");
    
    const revoked = await (prisma as any).adminAuditLog.findFirst({
      where: {
        action: "SESSION_REVOKED",
        entityType: "Session",
        entityId: tokenDigest,
      },
      select: { id: true },
    });

    if (revoked) {
      revokedTokensCache.add(tokenDigest);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Revokes a session token by persisting a revocation record to PostgreSQL.
 */
export async function revokeSession(token: string): Promise<void> {
  const tokenDigest = hashToken(token);
  revokedTokensCache.add(tokenDigest);

  try {
    const { prisma } = await import("database");
    await (prisma as any).adminAuditLog.create({
      data: {
        action: "SESSION_REVOKED",
        entityType: "Session",
        entityId: tokenDigest,
        description: "Admin session revoked upon logout",
        performedBy: "PRIMARY_ADMIN",
      },
    });
  } catch (err) {
    console.error("[revokeSession] Error persisting session revocation:", err);
  }
}

/**
 * Logs out the admin by revoking the session token server-side and deleting the cookie.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (sessionCookie?.value) {
    await revokeSession(sessionCookie.value);
  }

  cookieStore.delete(ADMIN_COOKIE_NAME);
  const entryPath = getAdminEntryPath();
  redirect(`/${entryPath}`);
}

/**
 * Verifies if current request has a valid, non-revoked admin session.
 * Request-scoped via React cache.
 */
export const getAdminSession = cache(async (): Promise<{ authenticated: boolean; username?: string }> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return { authenticated: false };
  }

  const { valid, username, tokenDigest } = verifySessionToken(sessionCookie.value);
  if (!valid || !tokenDigest) {
    return { authenticated: false };
  }

  // Verify against database revocation list
  const isRevoked = await isTokenRevokedInDb(tokenDigest);
  if (isRevoked) {
    return { authenticated: false };
  }

  return { authenticated: true, username: username || "PRIMARY_ADMIN" };
});

/**
 * Validates Origin and Referer headers against Host header for state-changing requests (CSRF Protection).
 */
export async function verifyCsrfOrigin(): Promise<boolean> {
  const headerList = await headers();
  const host = headerList.get("host");
  const origin = headerList.get("origin");
  const referer = headerList.get("referer");

  if (!host) return true;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Server-side guard that redirects unauthenticated requests to the secret admin entry page
 * and validates CSRF Origin headers.
 */
export async function requireAdminAuth(): Promise<{ username: string }> {
  const isOriginValid = await verifyCsrfOrigin();
  if (!isOriginValid) {
    throw new Error("Cross-origin request forbidden.");
  }

  const session = await getAdminSession();
  if (!session.authenticated || !session.username) {
    const entryPath = getAdminEntryPath();
    redirect(`/${entryPath}`);
  }
  return { username: session.username };
}
