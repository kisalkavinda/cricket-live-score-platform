import { prisma } from "database";

export interface SyncPayload {
  registrationId: string;
  registrationCode: string;
  tournamentId: string;
  teamName: string;
  leaderName: string;
  leaderWhatsapp: string;
  leaderIndexNumber: string;
  players: { name: string; indexNumber: string }[];
}

/**
 * Asynchronously synchronizes registration to secondary Google Sheets backup.
 * Supabase is the single source of truth. Failure in Google Sheets does NOT
 * invalidate or block the submitted registration; it updates the registration's
 * backupStatus to PENDING or FAILED with sanitized error diagnostics.
 */
export async function syncRegistrationToBackup(payload: SyncPayload): Promise<void> {
  const { registrationId } = payload;
  const now = new Date();

  // If no Google Sheets webhook or credentials are configured, keep as PENDING
  const sheetsWebhookUrl = process.env.GOOGLE_SHEETS_BACKUP_WEBHOOK_URL;

  if (!sheetsWebhookUrl) {
    // Left as PENDING until export/batch sync job runs
    return;
  }

  try {
    const response = await fetch(sheetsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        submittedAt: now.toISOString(),
      }),
      signal: AbortSignal.timeout(5000), // 5-second hard timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Mark as SYNCED
    await (prisma as any).registration.update({
      where: { id: registrationId },
      data: {
        backupStatus: "SYNCED",
        backupSyncedAt: new Date(),
        backupLastAttempt: now,
        backupError: null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Backup service unreachable";
    console.warn(`[BackupSync] Non-blocking backup failure for ${payload.registrationCode}:`, errorMessage);

    try {
      await (prisma as any).registration.update({
        where: { id: registrationId },
        data: {
          backupStatus: "FAILED",
          backupLastAttempt: now,
          backupError: errorMessage.slice(0, 255), // Sanitized short error
        },
      });
    } catch {
      // Non-blocking catch
    }
  }
}
