import { prisma } from "database";
import {
  registrationFormSchema,
  normalizeIndexNumber,
  RegistrationFormData,
} from "../validations/registration";
import { generateRegistrationCode } from "./registration-code";
import { syncRegistrationToGoogleSheets } from "./backup-sync";

export interface RegistrationResult {
  success: boolean;
  registrationId?: string;
  registrationCode?: string;
  teamName?: string;
  playerCount?: number;
  error?: string;
  details?: Record<string, string[]>;
}

/**
 * Authoritative Server-side Registration Service.
 */
export async function createRegistration(
  rawInput: unknown
): Promise<RegistrationResult> {
  // 1. Zod Server Validation
  const parseResult = registrationFormSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!formattedErrors[path]) formattedErrors[path] = [];
      formattedErrors[path].push(issue.message);
    }
    return {
      success: false,
      error: "Validation failed. Please correct the highlighted fields.",
      details: formattedErrors,
    };
  }

  const data: RegistrationFormData = parseResult.data;

  // 2. Normalize and check squad constraints
  const normalizedLeaderIndex = normalizeIndexNumber(data.leaderIndexNumber);
  const normalizedPlayers = data.players.map((p) => ({
    name: p.name.trim(),
    indexNumber: normalizeIndexNumber(p.indexNumber),
  }));

  if (normalizedPlayers.length < 7 || normalizedPlayers.length > 13) {
    return {
      success: false,
      error: `Invalid squad size: Minimum 7 and maximum 13 players are required (Received: ${normalizedPlayers.length}).`,
    };
  }

  // Check internal duplicates
  const internalIndexSet = new Set<string>();
  for (const player of normalizedPlayers) {
    if (internalIndexSet.has(player.indexNumber)) {
      return {
        success: false,
        error: `Duplicate index number inside squad: ${player.indexNumber} is entered more than once.`,
      };
    }
    internalIndexSet.add(player.indexNumber);
  }

  // Ensure leader is in squad
  const leaderInSquad = normalizedPlayers.some(
    (p) => p.indexNumber === normalizedLeaderIndex
  );
  if (!leaderInSquad) {
    return {
      success: false,
      error: `The team leader's index number (${normalizedLeaderIndex}) must be included in the player list.`,
    };
  }

  // 3. Check Tournament Validity & Status
  let tournament;
  try {
    tournament = await (prisma as any).tournament.findUnique({
      where: { id: data.tournamentId },
    });
  } catch (err: unknown) {
    console.error("[RegistrationService] DB findUnique error:", err);
  }

  // If tournament does not exist, check if any tournament exists or fallback
  if (!tournament) {
    const anyTournament = await (prisma as any).tournament.findFirst({
      where: { status: { in: ["REGISTRATION", "DRAFT", "SCHEDULED", "LIVE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!anyTournament) {
      return {
        success: false,
        error: "Tournament not found or registration is currently closed.",
      };
    }
    data.tournamentId = anyTournament.id;
    tournament = anyTournament;
  }

  if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") {
    return {
      success: false,
      error: "Team registration for this tournament is currently closed.",
    };
  }


  // 4. Determine Allowed Minimum Squad Size (Standard: 11, Exception: 7)
  let allowedMinimum = 11;
  let exceptions: any[] = [];
  try {
    exceptions = await (prisma as any).registrationException.findMany({
      where: { tournamentId: data.tournamentId },
    });
  } catch (err: unknown) {
    console.warn("[RegistrationService] Exception lookup warning:", err);
  }


  const cleanTeamName = data.teamName.trim().toLowerCase();
  const matchedException = exceptions.find((ex: any) => {
    const matchName = ex.teamName && cleanTeamName.includes(ex.teamName.trim().toLowerCase());
    const matchPrefix = ex.indexPrefix && (
      normalizedLeaderIndex.startsWith(ex.indexPrefix.trim().toUpperCase()) ||
      normalizedPlayers.some((p: any) => p.indexNumber.startsWith(ex.indexPrefix.trim().toUpperCase()))
    );
    return matchName || matchPrefix;
  });

  if (matchedException) {
    allowedMinimum = Math.max(7, matchedException.minPlayers || 7);
  }

  if (normalizedPlayers.length < allowedMinimum) {
    return {
      success: false,
      error: `Standard team registration requires a minimum of 11 players (Received: ${normalizedPlayers.length}). Squad sizes of 7–10 are restricted to pre-approved older batch exception teams.`,
    };
  }

  // 4. Tournament-Specific Cross-Team Duplicate Index Number Check
  const playerIndexList = normalizedPlayers.map((p) => p.indexNumber);
  try {
    const existingRegistrationPlayers = await (prisma as any).registrationPlayer.findMany({
      where: {
        indexNumber: { in: playerIndexList },
        registration: {
          tournamentId: data.tournamentId,
          status: { in: ["PENDING", "APPROVED"] },
        },
      },
      include: {
        registration: {
          select: {
            teamName: true,
            registrationCode: true,
            status: true,
          },
        },
      },
    });

    if (existingRegistrationPlayers && existingRegistrationPlayers.length > 0) {
      const duplicate = existingRegistrationPlayers[0];
      return {
        success: false,
        error: `University index number "${duplicate.indexNumber}" is already registered with team "${duplicate.registration.teamName}" for this tournament. Each student may only belong to one team.`,
      };
    }
  } catch (err: unknown) {
    console.error("[RegistrationService] Duplicate check error:", err);
  }

  // 5. Database Transaction to Create Registration with Collision Retry
  let registration: any = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts && !registration) {
    attempts++;
    const code = generateRegistrationCode();

    try {
      registration = await (prisma as any).registration.create({
        data: {
          registrationCode: code,
          tournamentId: data.tournamentId,
          teamName: data.teamName.trim(),
          leaderName: data.leaderName.trim(),
          leaderWhatsapp: data.leaderWhatsapp.trim(),
          leaderIndexNumber: normalizedLeaderIndex,
          status: "PENDING",
          backupStatus: "PENDING",
          players: {
            create: normalizedPlayers.map((player) => ({
              name: player.name,
              indexNumber: player.indexNumber,
            })),
          },
        },
        include: {
          players: true,
        },
      });
    } catch (txError: any) {
      // If collision on unique registrationCode, retry
      if (txError?.code === "P2002" && txError?.meta?.target?.includes("registrationCode")) {
        console.warn(`[RegistrationService] Collision on code ${code}, retrying attempt ${attempts}...`);
        continue;
      }
      console.error("[RegistrationService] Transaction failed:", txError);
      return {
        success: false,
        error: "Database transaction failed. Please check your connection and try again.",
      };
    }
  }

  if (!registration) {
    return {
      success: false,
      error: "Unable to allocate a unique registration reference. Please try again.",
    };
  }

  // 6. Asynchronous Secondary Backup Execution
  // Awaited to ensure completion in serverless environments, but isolated so failures NEVER fail registration
  try {
    await syncRegistrationToGoogleSheets(registration.id);
  } catch (backupErr) {
    console.warn("[RegistrationService] Non-blocking backup sync error:", backupErr);
  }

  return {
    success: true,
    registrationId: registration.id,
    registrationCode: registration.registrationCode,
    teamName: registration.teamName,
    playerCount: normalizedPlayers.length,
  };
}
