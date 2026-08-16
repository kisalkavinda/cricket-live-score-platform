import { prisma } from "database";
import {
  registrationFormSchema,
  normalizeIndexNumber,
  extractIntake,
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
  // Pre-filter empty player rows if at least 7 filled players exist
  let sanitizedInput = rawInput;
  if (
    rawInput &&
    typeof rawInput === "object" &&
    "players" in rawInput &&
    Array.isArray((rawInput as any).players)
  ) {
    const rawPlayers = (rawInput as any).players;
    const nonEmpty = rawPlayers.filter(
      (p: any) =>
        p &&
        typeof p === "object" &&
        ((p.name && String(p.name).trim().length > 0) ||
          (p.indexNumber && String(p.indexNumber).trim().length > 0))
    );
    if (nonEmpty.length >= 7) {
      sanitizedInput = {
        ...(rawInput as any),
        players: nonEmpty,
      };
    }
  }

  // 1. Zod Server Validation
  const parseResult = registrationFormSchema.safeParse(sanitizedInput);
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

  // Check Batch / Intake Uniformity (No mixed intakes allowed)
  const captainIntake = extractIntake(normalizedLeaderIndex);
  let primaryIntake = captainIntake;
  if (!primaryIntake) {
    for (const p of normalizedPlayers) {
      const found = extractIntake(p.indexNumber);
      if (found) {
        primaryIntake = found;
        break;
      }
    }
  }

  if (primaryIntake) {
    for (const player of normalizedPlayers) {
      const playerIntake = extractIntake(player.indexNumber);
      if (playerIntake && playerIntake !== primaryIntake) {
        return {
          success: false,
          error: `Mixed-intake squads are not allowed. All players must belong to Intake ${primaryIntake} (Player index "${player.indexNumber}" has Intake ${playerIntake}).`,
        };
      }
    }
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

  // If tournament does not exist, check if any tournament exists or auto-create
  if (!tournament) {
    let anyTournament = await (prisma as any).tournament.findFirst({
      where: { status: { in: ["REGISTRATION", "DRAFT", "SCHEDULED", "LIVE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!anyTournament) {
      anyTournament = await (prisma as any).tournament.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }
    if (!anyTournament) {
      anyTournament = await (prisma as any).tournament.create({
        data: {
          name: "Computing Premier League 2026",
          season: "2026",
          format: "League + Knockout",
          status: "REGISTRATION",
        },
      });
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
      where: {
        OR: [
          { tournamentId: data.tournamentId },
          { tournamentId: tournament?.id },
          { tournamentId: null },
        ],
        active: true,
      },
    });
  } catch (err: unknown) {
    try {
      exceptions = await (prisma as any).registrationException.findMany();
    } catch {
      console.warn("[RegistrationService] Exception lookup warning:", err);
    }
  }

  // Filter to active rules that match this tournament if specified
  const activeExceptions = exceptions.filter((ex: any) => {
    if (ex.active === false) return false;
    if (ex.tournamentId && ex.tournamentId !== data.tournamentId && ex.tournamentId !== tournament?.id) {
      return false;
    }
    return true;
  });

  // Helper to match intake number in university index format D/***/(intake)/0000
  const matchesIntakeOrIndex = (studentIndex: string, targetIntake: string): boolean => {
    if (!studentIndex || !targetIntake) return false;
    const normalizedIndex = studentIndex.trim().toUpperCase();
    const normalizedTarget = targetIntake.trim().toUpperCase();

    // 1. Direct segment match (e.g. target "38" in "D/IT/38/0001" or "D-CS-38-0001")
    const segments = normalizedIndex.split(/[\/\-_.\s]+/);
    if (segments.includes(normalizedTarget)) {
      return true;
    }

    // 2. Delimited substring match
    if (
      normalizedIndex.includes(`/${normalizedTarget}/`) ||
      normalizedIndex.includes(`-${normalizedTarget}-`) ||
      normalizedIndex.includes(`_${normalizedTarget}_`)
    ) {
      return true;
    }

    // 3. Compact clean substring / prefix match (e.g. "38" in "DIT380001")
    const cleanIndex = normalizedIndex.replace(/[^A-Z0-9]/g, "");
    const cleanTarget = normalizedTarget.replace(/[^A-Z0-9]/g, "");
    if (cleanTarget.length >= 2 && cleanIndex.includes(cleanTarget)) {
      return true;
    }

    return false;
  };

  const matchedException = activeExceptions.find((ex: any) => {
    const exIntake = (ex.indexPrefix || "").trim();
    const exName = (ex.name || "").trim();

    // 1. Match on configured Intake / Index Prefix
    if (exIntake) {
      const matchCaptain = matchesIntakeOrIndex(data.leaderIndexNumber, exIntake);
      const matchAnyPlayer = data.players.some((p) => matchesIntakeOrIndex(p.indexNumber, exIntake));
      if (matchCaptain || matchAnyPlayer) return true;
    }

    // 2. Match if rule name contains an intake number (e.g. "Intake 38" or "Batch 38")
    const extractedIntakeMatch = exName.match(/(?:intake|batch|year|\b)(\d{2,3})\b/i);
    if (extractedIntakeMatch && extractedIntakeMatch[1]) {
      const intakeNum = extractedIntakeMatch[1];
      const matchCaptain = matchesIntakeOrIndex(data.leaderIndexNumber, intakeNum);
      const matchAnyPlayer = data.players.some((p) => matchesIntakeOrIndex(p.indexNumber, intakeNum));
      if (matchCaptain || matchAnyPlayer) return true;
    }

    // 3. Universal Tournament Exception: If no intake was constrained, applies to all teams in the tournament
    if (!exIntake && !extractedIntakeMatch) {
      return true;
    }

    return false;
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
        error: `Database error: ${txError?.message || 'Database transaction failed. Please check your connection and try again.'}`,
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

export async function getRegistrationReceipt(registrationCode: string) {
  if (!registrationCode || typeof registrationCode !== 'string') return null;
  try {
    const reg = await (prisma as any).registration.findUnique({
      where: { registrationCode: registrationCode.trim().toUpperCase() },
      select: {
        id: true,
        registrationCode: true,
        teamName: true,
        leaderName: true,
        leaderIndexNumber: true,
        createdAt: true,
        status: true,
        tournament: {
          select: {
            name: true,
            season: true,
          },
        },
        players: {
          select: {
            id: true,
            name: true,
            indexNumber: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return reg;
  } catch (err) {
    console.error("[getRegistrationReceipt] Error:", err);
    return null;
  }
}

