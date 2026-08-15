import "server-only";
import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Validates and retrieves server-side Google Sheets configuration.
 * Returns null if any required variable is missing, without throwing.
 */
export function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim();

  if (!spreadsheetId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  // Handle newline escaping in environment variables (e.g. from .env or Vercel)
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
  };
}

/**
 * Checks whether Google Sheets secondary backup configuration is present.
 */
export function isGoogleSheetsConfigured(): boolean {
  return getGoogleSheetsConfig() !== null;
}

/**
 * Returns the configured spreadsheet ID, or null if unconfigured.
 */
export function getSpreadsheetId(): string | null {
  const config = getGoogleSheetsConfig();
  return config ? config.spreadsheetId : null;
}

let cachedSheetsClient: sheets_v4.Sheets | null = null;
let cachedEmail: string | null = null;

/**
 * Authenticates with Google API using service account credentials
 * and returns a typed Google Sheets client.
 */
export function getGoogleSheetsClient(): sheets_v4.Sheets | null {
  const config = getGoogleSheetsConfig();
  if (!config) {
    return null;
  }

  // Re-use cached client if credentials haven't changed
  if (cachedSheetsClient && cachedEmail === config.clientEmail) {
    return cachedSheetsClient;
  }

  try {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: SCOPES,
    });

    cachedSheetsClient = google.sheets({ version: "v4", auth });
    cachedEmail = config.clientEmail;
    return cachedSheetsClient;
  } catch (error) {
    console.error("[GoogleSheets] Failed to initialize Google Auth client:", error instanceof Error ? error.message : "Auth initialization error");
    return null;
  }
}

/**
 * Diagnostic utility to verify Google service account authentication
 * and check that the 3 required worksheets exist: 'Registrations', 'Players', 'Backup Audit'.
 * Does not mutate any data.
 */
export async function verifyGoogleSheetsConnection(): Promise<{
  success: boolean;
  message: string;
  sheetNames?: string[];
}> {
  const config = getGoogleSheetsConfig();
  if (!config) {
    return {
      success: false,
      message: "Google Sheets configuration missing. Required: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY.",
    };
  }

  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return {
      success: false,
      message: "Failed to initialize Google Sheets authentication client.",
    };
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: "sheets.properties.title",
    });

    const titles = (response.data.sheets || [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t));

    const requiredSheets = ["Registrations", "Players", "Backup Audit"];
    const missingSheets = requiredSheets.filter((req) => !titles.includes(req));

    if (missingSheets.length > 0) {
      return {
        success: false,
        message: `Spreadsheet connected, but missing required worksheet(s): ${missingSheets.join(", ")}. Found: ${titles.join(", ") || "none"}.`,
        sheetNames: titles,
      };
    }

    return {
      success: true,
      message: `Successfully connected to spreadsheet (${config.spreadsheetId}). Verified worksheets: ${requiredSheets.join(", ")}.`,
      sheetNames: titles,
    };
  } catch (err: unknown) {
    const safeError = err instanceof Error ? err.message : String(err);
    // Sanitize any potential secret leakage
    const sanitizedError = safeError.replace(/-----BEGIN PRIVATE KEY-----[^]+?-----END PRIVATE KEY-----/g, "[REDACTED]");

    return {
      success: false,
      message: `Google Sheets connection failed: ${sanitizedError}`,
    };
  }
}
