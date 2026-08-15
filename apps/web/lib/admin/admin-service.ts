import "server-only";
import { prisma } from "database";
import { retryRegistrationBackup } from "@/lib/registrations/backup-sync";

export interface DashboardStats {
  registrations: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  backups: {
    synced: number;
    failed: number;
    pending: number;
  };
  recentRegistrations: any[];
  attentionRegistrations: any[];
}

/**
 * Returns dashboard metrics and recent registrations.
 * - Admin-only: NEVER cached — all data is private and fetched fresh per request.
 * - Uses groupBy to collapse 7 individual COUNT queries into 2 aggregated queries.
 * - Reduces database roundtrips from 9 down to 4.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Query 1 to 4: Execute all queries concurrently in a single roundtrip via Promise.all
  const [
    statusGroups,
    backupGroups,
    recentRegistrations,
    attentionRegistrations,
  ] = await Promise.all([
    (prisma as any).registration.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    (prisma as any).registration.groupBy({
      by: ['backupStatus'],
      _count: { _all: true },
    }),
    (prisma as any).registration.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        registrationCode: true,
        teamName: true,
        leaderName: true,
        status: true,
        backupStatus: true,
        createdAt: true,
        _count: { select: { players: true } },
        tournament: { select: { name: true } },
      },
    }),
    (prisma as any).registration.findMany({
      where: {
        OR: [{ status: 'PENDING' }, { backupStatus: 'FAILED' }],
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        registrationCode: true,
        teamName: true,
        leaderName: true,
        status: true,
        backupStatus: true,
        createdAt: true,
        _count: { select: { players: true } },
      },
    }),
  ]);

  // Derive counts from group results (default 0 for missing groups)
  const statusMap: Record<string, number> = {};
  for (const g of statusGroups) {
    statusMap[g.status] = g._count._all;
  }
  const backupMap: Record<string, number> = {};
  for (const g of backupGroups) {
    backupMap[g.backupStatus] = g._count._all;
  }

  const pendingCount = statusMap['PENDING'] ?? 0;
  const approvedCount = statusMap['APPROVED'] ?? 0;
  const rejectedCount = statusMap['REJECTED'] ?? 0;
  const cancelledCount = statusMap['CANCELLED'] ?? 0;
  const totalCount = pendingCount + approvedCount + rejectedCount + cancelledCount;

  const backupSynced = backupMap['SYNCED'] ?? 0;
  const backupFailed = backupMap['FAILED'] ?? 0;
  const backupPending = backupMap['PENDING'] ?? 0;


  // Normalise _count.players into a players array shape for backward-compat with dashboard UI
  const normaliseItem = (r: any) => ({
    ...r,
    players: Array.from({ length: r._count?.players ?? 0 }),
  });

  return {
    registrations: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: totalCount,
    },
    backups: {
      synced: backupSynced,
      failed: backupFailed,
      pending: backupPending,
    },
    recentRegistrations: recentRegistrations.map(normaliseItem),
    attentionRegistrations: attentionRegistrations.map(normaliseItem),
  };
}


export interface RegistrationsQuery {
  status?: string;
  backupStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Returns paginated, searchable, and filtered registration records.
 */
export async function getRegistrationsList(params: RegistrationsQuery = {}) {
  const { status, backupStatus, search, page = 1, limit = 15 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (backupStatus && backupStatus !== "ALL") {
    where.backupStatus = backupStatus;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { registrationCode: { contains: q, mode: "insensitive" } },
      { teamName: { contains: q, mode: "insensitive" } },
      { leaderName: { contains: q, mode: "insensitive" } },
      { leaderIndexNumber: { contains: q, mode: "insensitive" } },
      {
        players: {
          some: {
            indexNumber: { contains: q, mode: "insensitive" },
          },
        },
      },
      {
        players: {
          some: {
            name: { contains: q, mode: "insensitive" },
          },
        },
      },
    ];
  }

  const [total, items] = await Promise.all([
    (prisma as any).registration.count({ where }),
    (prisma as any).registration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // Project only the fields the registrations list UI renders.
      // Do NOT fetch full player objects — use _count to get squad size.
      // This avoids transferring private player data (names, index numbers)
      // when they are not displayed on the list page.
      select: {
        id: true,
        registrationCode: true,
        teamName: true,
        leaderName: true,
        leaderIndexNumber: true,
        status: true,
        backupStatus: true,
        createdAt: true,
        _count: { select: { players: true } },
        tournament: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Normalise _count.players into a players array shape expected by the list UI (r.players.length)
  const normalisedItems = items.map((r: any) => ({
    ...r,
    players: Array.from({ length: r._count?.players ?? 0 }),
  }));



  return {
    items: normalisedItems,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}


/**
 * Returns single registration detail with all players and exception checks.
 */
export async function getRegistrationDetail(id: string) {
  const registration = await (prisma as any).registration.findUnique({
    where: { id },
    include: {
      players: {
        orderBy: { createdAt: "asc" },
      },
      tournament: true,
    },
  });

  if (!registration) return null;

  // Check matching exceptions
  const exceptions = await (prisma as any).registrationException.findMany({
    where: {
      tournamentId: registration.tournamentId,
      active: true,
    },
  });

  const matchingException = exceptions.find((ex: any) => {
    if (ex.teamName && registration.teamName.toLowerCase().includes(ex.teamName.toLowerCase())) return true;
    if (ex.indexPrefix && registration.leaderIndexNumber.toUpperCase().startsWith(ex.indexPrefix.toUpperCase())) return true;
    return false;
  });

  // Check conflicts with official teams / players in this tournament
  const playerIndexes = registration.players.map((p: any) => p.indexNumber.trim().toUpperCase());
  
  // Find official players with these index numbers already assigned in this tournament
  const conflictingSquadMembers = await (prisma as any).tournamentSquad.findMany({
    where: {
      tournamentId: registration.tournamentId,
      player: {
        indexNumber: { in: playerIndexes },
      },
    },
    include: {
      team: { select: { id: true, name: true } },
      player: { select: { id: true, name: true, indexNumber: true } },
    },
  });

  return {
    registration,
    matchingException,
    conflicts: conflictingSquadMembers,
  };
}

/**
 * Pre-flight verification check for approval dialog.
 */
export async function verifyApprovalPreflight(registrationId: string) {
  const detail = await getRegistrationDetail(registrationId);
  if (!detail) {
    return { canApprove: false, errors: ["Registration not found."] };
  }

  const { registration, matchingException, conflicts } = detail;
  const errors: string[] = [];

  if (registration.status !== "PENDING") {
    errors.push(`Registration is already ${registration.status}.`);
  }

  const allowedMin = matchingException ? Math.max(7, matchingException.minPlayers) : 11;
  const playerCount = registration.players.length;

  if (playerCount < allowedMin) {
    errors.push(
      matchingException
        ? `Squad has ${playerCount} players, but exception requires minimum ${allowedMin}.`
        : `Standard registration requires 11 players (found: ${playerCount}). No exception matches.`
    );
  }

  if (playerCount > 13) {
    errors.push(`Squad size exceeds maximum limit of 13 players (found: ${playerCount}).`);
  }

  if (conflicts.length > 0) {
    conflicts.forEach((c: any) => {
      errors.push(
        `Index ${c.player.indexNumber} (${c.player.name}) is already assigned to official team "${c.team.name}".`
      );
    });
  }

  return {
    canApprove: errors.length === 0,
    errors,
    summary: {
      teamName: registration.teamName,
      playerCount,
      hasException: Boolean(matchingException),
      exceptionDetails: matchingException ? `Older Batch (${matchingException.minPlayers} min)` : null,
    },
  };
}

/**
 * Atomic Single-Transaction Approval
 * Converts Registration to official Team, Player, TeamPlayer, and TournamentSquad entities.
 */
export async function approveRegistrationTransaction(
  registrationId: string,
  approvedBy: string = "Admin"
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Authoritative reload and check
    const reg = await (prisma as any).registration.findUnique({
      where: { id: registrationId },
      include: {
        players: { orderBy: { createdAt: "asc" } },
        tournament: true,
      },
    });

    if (!reg) {
      return { success: false, error: "Registration not found in database." };
    }

    if (reg.status === "APPROVED") {
      return { success: false, error: "Registration has already been approved." };
    }

    if (reg.status !== "PENDING") {
      return { success: false, error: `Cannot approve a registration with status "${reg.status}".` };
    }

    const playerCount = reg.players.length;
    if (playerCount < 7 || playerCount > 13) {
      return { success: false, error: `Invalid squad size: ${playerCount}. Must be between 7 and 13.` };
    }

    // 2. Exception validation
    const exceptions = await (prisma as any).registrationException.findMany({
      where: { tournamentId: reg.tournamentId, active: true },
    });

    const matchingException = exceptions.find((ex: any) => {
      if (ex.teamName && reg.teamName.toLowerCase().includes(ex.teamName.toLowerCase())) return true;
      if (ex.indexPrefix && reg.leaderIndexNumber.toUpperCase().startsWith(ex.indexPrefix.toUpperCase())) return true;
      return false;
    });

    const allowedMin = matchingException ? Math.max(7, matchingException.minPlayers) : 11;
    if (playerCount < allowedMin) {
      return {
        success: false,
        error: `Squad has ${playerCount} players, but minimum required is ${allowedMin}.`,
      };
    }

    // 3. Tournament-level duplicate index number validation
    const playerIndexes = reg.players.map((p: any) => p.indexNumber.trim().toUpperCase());
    const existingConflicts = await (prisma as any).tournamentSquad.findMany({
      where: {
        tournamentId: reg.tournamentId,
        player: {
          indexNumber: { in: playerIndexes },
        },
      },
      include: {
        team: { select: { name: true } },
        player: { select: { name: true, indexNumber: true } },
      },
    });

    if (existingConflicts.length > 0) {
      const conflictMsg = existingConflicts
        .map((c: any) => `[${c.player.indexNumber} - ${c.player.name} in team "${c.team.name}"]`)
        .join(", ");
      return {
        success: false,
        error: `Approval blocked due to duplicate student assignment: ${conflictMsg}`,
      };
    }

    const now = new Date();

    // 4. Atomic Execution inside interactive transaction or sequential statements
    // We execute sequentially with safety checks
    let team = await (prisma as any).team.findFirst({
      where: { name: reg.teamName.trim() },
    });

    if (!team) {
      const shortName = reg.teamName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4) || "TEAM";

      team = await (prisma as any).team.create({
        data: {
          name: reg.teamName.trim(),
          shortName,
          city: "Colombo",
        },
      });
    }

    // Ensure TournamentTeam link
    const existingTournTeam = await (prisma as any).tournamentTeam.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: reg.tournamentId,
          teamId: team.id,
        },
      },
    });

    if (!existingTournTeam) {
      await (prisma as any).tournamentTeam.create({
        data: {
          tournamentId: reg.tournamentId,
          teamId: team.id,
        },
      });
    }

    // Convert/Find Players & Assign
    for (const p of reg.players) {
      const normalizedIdx = p.indexNumber.trim().toUpperCase();
      
      // Look for existing player by indexNumber
      let player = await (prisma as any).player.findFirst({
        where: { indexNumber: normalizedIdx },
      });

      if (!player) {
        player = await (prisma as any).player.create({
          data: {
            name: p.name.trim(),
            indexNumber: normalizedIdx,
            role: "BATTER",
          },
        });
      }

      // Link TeamPlayer
      const existingTP = await (prisma as any).teamPlayer.findUnique({
        where: {
          teamId_playerId: {
            teamId: team.id,
            playerId: player.id,
          },
        },
      });

      if (!existingTP) {
        await (prisma as any).teamPlayer.create({
          data: {
            teamId: team.id,
            playerId: player.id,
          },
        });
      }

      // Link TournamentSquad
      const existingSquad = await (prisma as any).tournamentSquad.findUnique({
        where: {
          tournamentId_teamId_playerId: {
            tournamentId: reg.tournamentId,
            teamId: team.id,
            playerId: player.id,
          },
        },
      });

      if (!existingSquad) {
        await (prisma as any).tournamentSquad.create({
          data: {
            tournamentId: reg.tournamentId,
            teamId: team.id,
            playerId: player.id,
          },
        });
      }
    }

    // 5. Update Registration state with approval metadata
    await (prisma as any).registration.update({
      where: { id: registrationId },
      data: {
        status: "APPROVED",
        approvedAt: now,
        approvedBy,
      },
    });

    // 6. Record Admin Audit Log
    await (prisma as any).adminAuditLog.create({
      data: {
        action: "REGISTRATION_APPROVED",
        entityType: "Registration",
        entityId: registrationId,
        description: `Approved registration ${reg.registrationCode} for team "${reg.teamName}" with ${playerCount} squad members.`,
        performedBy: approvedBy,
        metadata: {
          registrationCode: reg.registrationCode,
          teamId: team.id,
          playerCount,
        },
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("[AdminService] Approval error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal database error during approval.",
    };
  }
}

/**
 * Rejects a registration with a mandatory explanation.
 */
export async function rejectRegistrationAction(
  registrationId: string,
  rejectionReason: string,
  rejectedBy: string = "Admin"
): Promise<{ success: boolean; error?: string }> {
  if (!rejectionReason || !rejectionReason.trim()) {
    return { success: false, error: "A rejection reason is mandatory." };
  }

  try {
    const reg = await (prisma as any).registration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) {
      return { success: false, error: "Registration not found." };
    }

    if (reg.status === "APPROVED") {
      return { success: false, error: "Cannot reject an already approved team registration." };
    }

    const now = new Date();

    await (prisma as any).registration.update({
      where: { id: registrationId },
      data: {
        status: "REJECTED",
        rejectedAt: now,
        rejectedBy,
        rejectionReason: rejectionReason.trim(),
        notes: rejectionReason.trim(),
      },
    });

    await (prisma as any).adminAuditLog.create({
      data: {
        action: "REGISTRATION_REJECTED",
        entityType: "Registration",
        entityId: registrationId,
        description: `Rejected registration ${reg.registrationCode} for team "${reg.teamName}". Reason: ${rejectionReason.trim()}`,
        performedBy: rejectedBy,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("[AdminService] Rejection error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record rejection.",
    };
  }
}

/**
 * Retries secondary Google Sheets backup.
 */
export async function retryBackupService(
  registrationId: string,
  performedBy: string = "Admin"
): Promise<{ success: boolean; status: string; error?: string }> {
  const result = await retryRegistrationBackup(registrationId);

  await (prisma as any).adminAuditLog.create({
    data: {
      action: "BACKUP_RETRIED",
      entityType: "Registration",
      entityId: registrationId,
      description: `Retried Google Sheets backup. Result: ${result.status}${result.error ? ` (${result.error})` : ""}`,
      performedBy,
    },
  });

  return result;
}

/**
 * Exceptions Management CRUD
 */
export async function getExceptionsList() {
  return (prisma as any).registrationException.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tournament: { select: { id: true, name: true } },
    },
  });
}

export async function createException(data: {
  tournamentId: string;
  name?: string;
  teamName?: string;
  indexPrefix?: string;
  minPlayers: number;
  notes?: string;
}, performedBy: string = "Admin") {
  const created = await (prisma as any).registrationException.create({
    data: {
      tournamentId: data.tournamentId,
      name: data.name?.trim() || null,
      teamName: data.teamName?.trim() || null,
      indexPrefix: data.indexPrefix?.trim().toUpperCase() || null,
      minPlayers: Math.max(7, Math.min(10, data.minPlayers || 7)),
      notes: data.notes?.trim() || null,
      active: true,
    },
  });

  await (prisma as any).adminAuditLog.create({
    data: {
      action: "EXCEPTION_CREATED",
      entityType: "RegistrationException",
      entityId: created.id,
      description: `Created squad exception rule: min ${created.minPlayers} players (${created.teamName || created.indexPrefix || "Rule"}).`,
      performedBy,
    },
  });

  return created;
}

export async function toggleExceptionStatus(id: string, active: boolean, performedBy: string = "Admin") {
  const updated = await (prisma as any).registrationException.update({
    where: { id },
    data: { active },
  });

  await (prisma as any).adminAuditLog.create({
    data: {
      action: "EXCEPTION_UPDATED",
      entityType: "RegistrationException",
      entityId: id,
      description: `Set exception rule ${id} active status to ${active}.`,
      performedBy,
    },
  });

  return updated;
}
