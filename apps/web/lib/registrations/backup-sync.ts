import "server-only";
import { prisma } from "database";
import {
  getGoogleSheetsClient,
  getSpreadsheetId,
  isGoogleSheetsConfigured,
} from "./google-sheets";

export interface SyncResult {
  success: boolean;
  status: "SYNCED" | "PENDING" | "FAILED";
  error?: string;
}

/**
 * Sanitizes any sensitive substrings from error messages before logging or storing.
 */
function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/-----BEGIN PRIVATE KEY-----[^]+?-----END PRIVATE KEY-----/g, "[REDACTED]")
    .replace(/(key=|privateKey=|secret=|password=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 255);
}

/**
 * Authoritatively synchronizes a registration from Supabase PostgreSQL to Google Sheets.
 *
 * Requirements:
 * 1. Supabase PostgreSQL is the authoritative source of truth; data is read fresh from DB.
 * 2. Missing Google credentials result in status: 'PENDING' without recording an error.
 * 3. Synchronization is fully idempotent (updates existing rows rather than creating duplicates).
 * 4. Stale player rows are removed/cleared if player count decreased.
 * 5. Every synchronization attempt appends an audit log in 'Backup Audit'.
 * 6. Google Sheets failure updates the database backup status to 'FAILED' but does NOT throw.
 */
export async function syncRegistrationToGoogleSheets(
  registrationId: string
): Promise<SyncResult> {
  const now = new Date();

  // 1. Authoritative DB fetch
  let registration: any = null;
  try {
    registration = await (prisma as any).registration.findUnique({
      where: { id: registrationId },
      include: {
        players: {
          orderBy: { id: "asc" },
        },
        tournament: true,
      },
    });
  } catch (dbError) {
    console.error("[BackupSync] Database read error for registrationId:", registrationId, dbError);
    return {
      success: false,
      status: "FAILED",
      error: "Unable to read registration from database",
    };
  }

  if (!registration) {
    return {
      success: false,
      status: "FAILED",
      error: `Registration ${registrationId} not found in database`,
    };
  }

  const registrationCode = registration.registrationCode;

  // 2. Check Google Sheets configuration
  if (!isGoogleSheetsConfigured()) {
    // Treat unconfigured environment as PENDING
    try {
      if (registration.backupStatus !== "PENDING") {
        await (prisma as any).registration.update({
          where: { id: registrationId },
          data: {
            backupStatus: "PENDING",
            backupError: null,
          },
        });
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      status: "PENDING",
    };
  }

  const sheets = getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets || !spreadsheetId) {
    const errorMsg = "Google Sheets client failed to initialize";
    await recordFailedBackup(registrationId, registrationCode, now, errorMsg);
    return { success: false, status: "FAILED", error: errorMsg };
  }

  try {
    const tournamentName =
      registration.tournament?.name || "Computing Premier League 2026";
    const players = registration.players || [];
    const leaderIndex = registration.leaderIndexNumber;

    // --- SHEET 1: Registrations (Columns A:J) ---
    // A: Registration Code, B: Tournament, C: Team Name, D: Leader Name, E: Leader WhatsApp,
    // F: Leader Index Number, G: Player Count, H: Registration Status, I: Backup Status, J: Submitted At
    const registrationRow = [
      registrationCode,
      tournamentName,
      registration.teamName,
      registration.leaderName,
      registration.leaderWhatsapp,
      leaderIndex,
      players.length,
      registration.status,
      "SYNCED",
      registration.createdAt
        ? new Date(registration.createdAt).toISOString()
        : now.toISOString(),
    ];

    // Read existing Registration codes from Column A
    const regCodesRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Registrations!A:A",
    });

    const regRows = regCodesRes.data.values || [];
    let existingRegRowIndex = -1;

    for (let i = 0; i < regRows.length; i++) {
      if (regRows[i] && regRows[i][0] === registrationCode) {
        existingRegRowIndex = i + 1; // 1-indexed sheet row
        break;
      }
    }

    if (existingRegRowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registrations!A${existingRegRowIndex}:J${existingRegRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [registrationRow],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Registrations!A:J",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [registrationRow],
        },
      });
    }

    // --- SHEET 2: Players (Columns A:G) ---
    // A: Registration Code, B: Team Name, C: Player Number, D: Player Name,
    // E: University Index Number, F: Is Leader, G: Registration Status

    // Read existing player rows from Players sheet (A:C for mapping)
    const playersSheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Players!A:C",
    });

    const existingPlayerRows = playersSheetRes.data.values || [];
    // Map of playerNumber (as number) -> 1-indexed row number
    const existingPlayerSlots: Map<number, number> = new Map();

    for (let i = 0; i < existingPlayerRows.length; i++) {
      const row = existingPlayerRows[i];
      if (row && row[0] === registrationCode) {
        const pNum = parseInt(row[2], 10);
        if (!isNaN(pNum)) {
          existingPlayerSlots.set(pNum, i + 1);
        }
      }
    }

    // Update or append current players (Player 1 to N)
    for (let idx = 0; idx < players.length; idx++) {
      const player = players[idx];
      const playerNumber = idx + 1;
      const isLeader =
        player.indexNumber.trim().toUpperCase() ===
        leaderIndex.trim().toUpperCase()
          ? "YES"
          : "NO";

      const playerRow = [
        registrationCode,
        registration.teamName,
        playerNumber,
        player.name,
        player.indexNumber,
        isLeader,
        registration.status,
      ];

      const existingRowNumber = existingPlayerSlots.get(playerNumber);

      if (existingRowNumber) {
        // Update existing player row
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Players!A${existingRowNumber}:G${existingRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [playerRow],
          },
        });
      } else {
        // Append new player row
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Players!A:G",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [playerRow],
          },
        });
      }
    }

    // Handle Stale Player Rows (e.g. if squad size decreased from 13 to 11 on re-sync)
    for (const [pNum, rowNum] of existingPlayerSlots.entries()) {
      if (pNum > players.length) {
        // Clear stale row data in Google Sheets
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `Players!A${rowNum}:G${rowNum}`,
        });
      }
    }

    // --- SHEET 3: Backup Audit (Columns A:E) ---
    // A: Registration Code, B: Attempted At, C: Result, D: Error, E: Synced At
    const auditRow = [
      registrationCode,
      now.toISOString(),
      "SUCCESS",
      "",
      now.toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Backup Audit!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [auditRow],
      },
    });

    // --- UPDATE DATABASE BACKUP STATUS ---
    await (prisma as any).registration.update({
      where: { id: registrationId },
      data: {
        backupStatus: "SYNCED",
        backupSyncedAt: now,
        backupLastAttempt: now,
        backupError: null,
      },
    });

    return {
      success: true,
      status: "SYNCED",
    };
  } catch (error: unknown) {
    const safeError = sanitizeErrorMessage(error);
    console.warn(
      `[BackupSync] Google Sheets backup sync failed for ${registrationCode}:`,
      safeError
    );

    // Attempt to log failure in Backup Audit sheet if Sheets client is still reachable
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Backup Audit!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              registrationCode,
              now.toISOString(),
              "FAILED",
              safeError,
              "",
            ],
          ],
        },
      });
    } catch {
      // Non-blocking if Sheets itself was the cause of failure
    }

    // Update database status to FAILED
    await recordFailedBackup(registrationId, registrationCode, now, safeError);

    return {
      success: false,
      status: "FAILED",
      error: safeError,
    };
  }
}

/**
 * Re-attempts Google Sheets backup for an existing registration.
 * Fully idempotent.
 */
export async function retryRegistrationBackup(
  registrationId: string
): Promise<SyncResult> {
  return syncRegistrationToGoogleSheets(registrationId);
}

/**
 * Helper to record failed backup state in Supabase PostgreSQL.
 */
async function recordFailedBackup(
  registrationId: string,
  registrationCode: string,
  attemptedAt: Date,
  errorMessage: string
): Promise<void> {
  try {
    await (prisma as any).registration.update({
      where: { id: registrationId },
      data: {
        backupStatus: "FAILED",
        backupLastAttempt: attemptedAt,
        backupError: errorMessage.slice(0, 255),
      },
    });
  } catch (dbErr) {
    console.error(
      `[BackupSync] Could not update failed backup status for ${registrationCode}:`,
      dbErr
    );
  }
}
