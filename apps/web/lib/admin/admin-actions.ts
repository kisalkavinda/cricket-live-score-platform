'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminAuth, loginAdmin, logoutAdmin, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  approveRegistrationTransaction,
  rejectRegistrationAction,
  retryBackupService,
  createException,
  toggleExceptionStatus,
} from '@/lib/admin/admin-service';
import {
  createTeamSchema,
  updateTeamSchema,
  createPlayerSchema,
  createTournamentSchema,
  updateTournamentSchema,
  createExceptionSchema,
} from '@/lib/validations/admin';
import { prisma } from 'database';
import { normalizeImageUrl } from '@/lib/utils/image-utils';

export async function loginAdminServerAction(password: string) {
  if (!password || typeof password !== 'string') {
    return { success: false, error: 'Password is required.' };
  }
  return loginAdmin(password);
}

export async function logoutAdminServerAction() {
  await logoutAdmin();
}

export async function approveRegistrationServerAction(registrationId: string, forceOverride: boolean = false) {
  await requireAdminAuth();
  if (!registrationId || typeof registrationId !== 'string') {
    return { success: false, error: 'Invalid registration ID.' };
  }
  const entryPath = getAdminEntryPath();
  const result = await approveRegistrationTransaction(registrationId.trim(), "PRIMARY_ADMIN", Boolean(forceOverride));
  if (result.success) {
    revalidatePath(`/${entryPath}`);
    revalidatePath(`/${entryPath}/dashboard`);
    revalidatePath(`/${entryPath}/registrations`);
    revalidatePath(`/${entryPath}/registrations/${registrationId.trim()}`);
    revalidatePath(`/${entryPath}/teams`);
    revalidatePath(`/${entryPath}/players`);
    revalidateTag('teams-count', 'seconds');
  }
  return result;
}

export async function rejectRegistrationServerAction(registrationId: string, reason: string) {
  await requireAdminAuth();
  if (!registrationId || typeof registrationId !== 'string') {
    return { success: false, error: 'Invalid registration ID.' };
  }
  const safeReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : 'Registration rejected by administrator.';
  const entryPath = getAdminEntryPath();
  const result = await rejectRegistrationAction(registrationId.trim(), safeReason, "PRIMARY_ADMIN");
  if (result.success) {
    revalidatePath(`/${entryPath}`);
    revalidatePath(`/${entryPath}/dashboard`);
    revalidatePath(`/${entryPath}/registrations`);
    revalidatePath(`/${entryPath}/registrations/${registrationId.trim()}`);
  }
  return result;
}

export async function deleteRegistrationServerAction(registrationId: string) {
  await requireAdminAuth();
  if (!registrationId || typeof registrationId !== 'string') {
    return { success: false, error: 'Invalid registration ID.' };
  }
  const entryPath = getAdminEntryPath();
  const cleanId = registrationId.trim();

  await (prisma as any).registrationPlayer.deleteMany({
    where: { registrationId: cleanId },
  });

  await (prisma as any).registration.delete({
    where: { id: cleanId },
  });

  revalidatePath(`/${entryPath}`);
  revalidatePath(`/${entryPath}/dashboard`);
  revalidatePath(`/${entryPath}/registrations`);
  revalidateTag('teams-count', 'seconds');
  return { success: true, redirectUrl: `/${entryPath}/registrations` };
}

export async function retryBackupServerAction(registrationId: string) {
  await requireAdminAuth();
  if (!registrationId || typeof registrationId !== 'string') {
    return { success: false, error: 'Invalid registration ID.' };
  }
  const entryPath = getAdminEntryPath();
  const result = await retryBackupService(registrationId.trim(), "PRIMARY_ADMIN");
  revalidatePath(`/${entryPath}/registrations/${registrationId.trim()}`);
  return result;
}

export async function createExceptionServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const rawInput = {
    tournamentId: (formData.get('tournamentId') as string) || '',
    name: (formData.get('name') as string) || undefined,
    teamName: (formData.get('teamName') as string) || undefined,
    indexPrefix: (formData.get('indexPrefix') as string) || undefined,
    minPlayers: parseInt(formData.get('minPlayers') as string, 10) || 7,
    notes: (formData.get('notes') as string) || undefined,
  };

  const parsed = createExceptionSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid exception input: ${parsed.error.issues[0]?.message}`);
  }

  await createException(parsed.data, "PRIMARY_ADMIN");

  revalidatePath(`/${entryPath}/registration-exceptions`);
  redirect(`/${entryPath}/registration-exceptions`);
}

export async function toggleExceptionServerAction(id: string, active: boolean) {
  await requireAdminAuth();
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid exception ID.');
  }
  const entryPath = getAdminEntryPath();
  await toggleExceptionStatus(id.trim(), Boolean(active), "PRIMARY_ADMIN");
  revalidatePath(`/${entryPath}/registration-exceptions`);
}

export async function updateExceptionServerAction(id: string, formData: FormData) {
  await requireAdminAuth();
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid exception ID.');
  }
  const entryPath = getAdminEntryPath();

  const tournamentId = (formData.get('tournamentId') as string)?.trim() || undefined;
  const name = (formData.get('name') as string)?.trim() || null;
  const teamName = (formData.get('teamName') as string)?.trim() || null;
  const indexPrefix = (formData.get('indexPrefix') as string)?.trim().toUpperCase() || null;
  const minPlayers = Math.min(Math.max(parseInt(formData.get('minPlayers') as string, 10) || 7, 7), 13);
  const active = formData.get('active') === 'true' || formData.get('active') === 'on';
  const notes = (formData.get('notes') as string)?.trim() || null;

  await (prisma as any).registrationException.update({
    where: { id: id.trim() },
    data: {
      tournamentId,
      name,
      teamName,
      indexPrefix,
      minPlayers,
      active,
      notes,
    },
  });

  revalidatePath(`/${entryPath}/registration-exceptions`);
  return { success: true };
}

export async function deleteExceptionServerAction(id: string) {
  await requireAdminAuth();
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid exception ID.');
  }
  const entryPath = getAdminEntryPath();

  await (prisma as any).registrationException.delete({
    where: { id: id.trim() },
  });

  revalidatePath(`/${entryPath}/registration-exceptions`);
  return { success: true };
}

export async function createTeamServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const rawInput = {
    name: (formData.get('name') as string) || '',
    shortName: (formData.get('shortName') as string) || '',
    city: (formData.get('city') as string) || null,
    logoUrl: (formData.get('logoUrl') as string) || null,
  };

  const parsed = createTeamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid team input: ${parsed.error.issues[0]?.message}`);
  }

  await prisma.team.create({
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      city: parsed.data.city || null,
      logoUrl: normalizeImageUrl(parsed.data.logoUrl) || null,
    },
  });

  revalidatePath(`/${entryPath}/teams`);
  redirect(`/${entryPath}/teams`);
}

export async function createPlayerServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const rawInput = {
    name: (formData.get('name') as string) || '',
    indexNumber: (formData.get('indexNumber') as string) || null,
    role: (formData.get('role') as any) || 'ALL_ROUNDER',
    battingStyle: (formData.get('battingStyle') as string) || null,
    bowlingStyle: (formData.get('bowlingStyle') as string) || null,
    profileImageUrl: (formData.get('profileImageUrl') as string) || null,
  };

  const parsed = createPlayerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid player input: ${parsed.error.issues[0]?.message}`);
  }

  await (prisma as any).player.create({
    data: {
      name: parsed.data.name,
      indexNumber: parsed.data.indexNumber || null,
      role: parsed.data.role,
      battingStyle: parsed.data.battingStyle || null,
      bowlingStyle: parsed.data.bowlingStyle || null,
      profileImageUrl: parsed.data.profileImageUrl || null,
    },
  });

  revalidatePath(`/${entryPath}/players`);
  redirect(`/${entryPath}/players`);
}

export async function createTournamentServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const rawInput = {
    name: (formData.get('name') as string) || '',
    season: (formData.get('season') as string) || '',
    format: (formData.get('format') as string) || '',
    tournamentFormat: (formData.get('tournamentFormat') as string) || '8_TEAM',
    oversPerInnings: parseInt(formData.get('oversPerInnings') as string, 10) || 20,
    ballsPerOver: parseInt(formData.get('ballsPerOver') as string, 10) || 6,
  };

  const parsed = createTournamentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid tournament input: ${parsed.error.issues[0]?.message}`);
  }

  await (prisma as any).tournament.create({
    data: {
      name: parsed.data.name,
      season: parsed.data.season,
      format: parsed.data.format,
      tournamentFormat: parsed.data.tournamentFormat,
      stages: {
        create: [
          {
            name: "Group Stage",
            stageOrder: 1,
            oversPerInnings: parsed.data.oversPerInnings,
            ballsPerOver: parsed.data.ballsPerOver,
          },
        ],
      },
    },
  });

  revalidatePath(`/${entryPath}/tournaments`);
  redirect(`/${entryPath}/tournaments`);
}

export async function addPlayerToTeamServerAction(teamId: string, playerId: string) {
  await requireAdminAuth();
  if (!teamId || !playerId || typeof teamId !== 'string' || typeof playerId !== 'string') {
    throw new Error('Invalid team ID or player ID.');
  }
  const entryPath = getAdminEntryPath();

  await (prisma as any).teamPlayer.upsert({
    where: {
      teamId_playerId: {
        teamId: teamId.trim(),
        playerId: playerId.trim(),
      },
    },
    update: {},
    create: {
      teamId: teamId.trim(),
      playerId: playerId.trim(),
    },
  });

  revalidatePath(`/${entryPath}/teams/${teamId.trim()}`);
  revalidatePath(`/${entryPath}/teams`);
}

export async function removePlayerFromTeamServerAction(teamPlayerId: string, teamId: string) {
  await requireAdminAuth();
  if (!teamPlayerId || typeof teamPlayerId !== 'string') {
    throw new Error('Invalid team player ID.');
  }
  const entryPath = getAdminEntryPath();

  await (prisma as any).teamPlayer.delete({
    where: { id: teamPlayerId.trim() },
  });

  if (teamId) {
    revalidatePath(`/${entryPath}/teams/${teamId.trim()}`);
  }
  revalidatePath(`/${entryPath}/teams`);
}

export async function updateTeamServerAction(teamId: string, formData: FormData) {
  await requireAdminAuth();
  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Invalid team ID.');
  }
  const entryPath = getAdminEntryPath();

  const rawInput = {
    name: (formData.get('name') as string) || undefined,
    shortName: (formData.get('shortName') as string) || undefined,
    city: (formData.get('city') as string) || null,
    logoUrl: (formData.get('logoUrl') as string) || null,
  };

  const parsed = updateTeamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid team update input: ${parsed.error.issues[0]?.message}`);
  }

  await (prisma as any).team.update({
    where: { id: teamId.trim() },
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      city: parsed.data.city || null,
      logoUrl: normalizeImageUrl(parsed.data.logoUrl) || null,
    },
  });

  revalidatePath(`/${entryPath}/teams/${teamId.trim()}`);
  revalidatePath(`/${entryPath}/teams`);
  revalidatePath('/');
}

export async function deleteTeamServerAction(teamId: string) {
  await requireAdminAuth();
  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Invalid team ID.');
  }
  const entryPath = getAdminEntryPath();
  const cleanTeamId = teamId.trim();

  // Find all players on this team before deleting relations
  const teamPlayerLinks = await (prisma as any).teamPlayer.findMany({
    where: { teamId: cleanTeamId },
    select: { playerId: true },
  });
  const playerIds: string[] = teamPlayerLinks.map((tp: any) => tp.playerId);

  await (prisma as any).tournamentSquad.deleteMany({
    where: { teamId: cleanTeamId },
  });
  await (prisma as any).teamPlayer.deleteMany({
    where: { teamId: cleanTeamId },
  });
  await (prisma as any).tournamentTeam.deleteMany({
    where: { teamId: cleanTeamId },
  });

  await (prisma as any).team.delete({
    where: { id: cleanTeamId },
  });

  for (const pid of playerIds) {
    try {
      await (prisma as any).tournamentSquad.deleteMany({
        where: { playerId: pid },
      });
      await (prisma as any).teamPlayer.deleteMany({
        where: { playerId: pid },
      });
      await (prisma as any).player.delete({
        where: { id: pid },
      });
    } catch (err: unknown) {
      console.warn(`[deleteTeamServerAction] Could not delete player ${pid}:`, err);
    }
  }

  revalidatePath(`/${entryPath}/teams`);
  revalidatePath(`/${entryPath}/players`);
  revalidatePath(`/${entryPath}/dashboard`);
  revalidatePath('/');
  return { success: true, redirectUrl: `/${entryPath}/teams` };
}

export async function createAndAssignPlayerServerAction(teamId: string, formData: FormData) {
  await requireAdminAuth();
  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Invalid team ID.');
  }
  const entryPath = getAdminEntryPath();

  const name = (formData.get('name') as string)?.trim();
  const indexNumber = (formData.get('indexNumber') as string)?.trim().toUpperCase() || null;
  const profileImageUrl = (formData.get('profileImageUrl') as string)?.trim() || null;

  if (!name || name.length < 2 || name.length > 100) {
    throw new Error('Player name must be between 2 and 100 characters.');
  }

  const player = await (prisma as any).player.create({
    data: {
      name,
      role: 'ALL_ROUNDER',
      indexNumber,
      profileImageUrl,
      teamPlayers: {
        create: [
          { teamId: teamId.trim() },
        ],
      },
    },
  });

  revalidatePath(`/${entryPath}/teams/${teamId.trim()}`);
  revalidatePath(`/${entryPath}/teams`);
  revalidatePath(`/${entryPath}/players`);
  return { success: true, playerId: player.id };
}

export async function updatePlayerServerAction(playerId: string, formData: FormData) {
  await requireAdminAuth();
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Invalid player ID.');
  }
  const entryPath = getAdminEntryPath();

  const name = (formData.get('name') as string)?.trim();
  const indexNumber = (formData.get('indexNumber') as string)?.trim().toUpperCase() || null;
  const profileImageUrl = (formData.get('profileImageUrl') as string)?.trim() || null;

  await (prisma as any).player.update({
    where: { id: playerId.trim() },
    data: {
      name: name && name.length >= 2 ? name : undefined,
      indexNumber,
      profileImageUrl,
    },
  });

  revalidatePath(`/${entryPath}/players/${playerId.trim()}`);
  revalidatePath(`/${entryPath}/players`);
  revalidatePath(`/${entryPath}/teams`);
}

export async function deletePlayerServerAction(playerId: string) {
  await requireAdminAuth();
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Invalid player ID.');
  }
  const entryPath = getAdminEntryPath();
  const cleanId = playerId.trim();

  await (prisma as any).tournamentSquad.deleteMany({
    where: { playerId: cleanId },
  });
  await (prisma as any).teamPlayer.deleteMany({
    where: { playerId: cleanId },
  });

  await (prisma as any).player.delete({
    where: { id: cleanId },
  });

  revalidatePath(`/${entryPath}/players`);
  revalidatePath(`/${entryPath}/teams`);
  return { success: true, redirectUrl: `/${entryPath}/players` };
}

export async function updateTournamentServerAction(tournamentId: string, formData: FormData) {
  await requireAdminAuth();
  if (!tournamentId || typeof tournamentId !== 'string') {
    throw new Error('Invalid tournament ID.');
  }
  const entryPath = getAdminEntryPath();

  const rawInput = {
    name: (formData.get('name') as string) || undefined,
    season: (formData.get('season') as string) || undefined,
    format: (formData.get('format') as string) || undefined,
    tournamentFormat: (formData.get('tournamentFormat') as string) || undefined,
    status: (formData.get('status') as any) || undefined,
  };

  const parsed = updateTournamentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid tournament update: ${parsed.error.issues[0]?.message}`);
  }

  await (prisma as any).tournament.update({
    where: { id: tournamentId.trim() },
    data: {
      name: parsed.data.name,
      season: parsed.data.season,
      format: parsed.data.format,
      ...(parsed.data.tournamentFormat ? { tournamentFormat: parsed.data.tournamentFormat } : {}),
      status: parsed.data.status,
    },
  });

  revalidatePath(`/${entryPath}/tournaments/${tournamentId.trim()}`);
  revalidatePath(`/${entryPath}/tournaments`);
  return { success: true };
}

export async function deleteTournamentServerAction(tournamentId: string) {
  await requireAdminAuth();
  if (!tournamentId || typeof tournamentId !== 'string') {
    throw new Error('Invalid tournament ID.');
  }
  const entryPath = getAdminEntryPath();
  const cleanId = tournamentId.trim();

  // 1. Clean up exceptions
  await (prisma as any).registrationException.deleteMany({
    where: { tournamentId: cleanId },
  }).catch(() => {});

  // 2. Clean up registrations & players
  const registrations = await (prisma as any).registration.findMany({
    where: { tournamentId: cleanId },
    select: { id: true },
  });
  const regIds = registrations.map((r: any) => r.id);
  if (regIds.length > 0) {
    await (prisma as any).registrationPlayer.deleteMany({
      where: { registrationId: { in: regIds } },
    }).catch(() => {});
    await (prisma as any).registration.deleteMany({
      where: { tournamentId: cleanId },
    }).catch(() => {});
  }

  // 3. Clean up matches and innings data
  const matches = await (prisma as any).match.findMany({
    where: { tournamentId: cleanId },
    select: { id: true },
  });
  const matchIds = matches.map((m: any) => m.id);
  if (matchIds.length > 0) {
    const inningsList = await (prisma as any).innings.findMany({
      where: { matchId: { in: matchIds } },
      select: { id: true },
    });
    const inningsIds = inningsList.map((i: any) => i.id);
    if (inningsIds.length > 0) {
      await (prisma as any).ballEvent.deleteMany({
        where: { inningsId: { in: inningsIds } },
      }).catch(() => {});
      await (prisma as any).inningsBatter.deleteMany({
        where: { inningsId: { in: inningsIds } },
      }).catch(() => {});
      await (prisma as any).inningsBowler.deleteMany({
        where: { inningsId: { in: inningsIds } },
      }).catch(() => {});
      await (prisma as any).innings.deleteMany({
        where: { matchId: { in: matchIds } },
      }).catch(() => {});
    }
    await (prisma as any).match.deleteMany({
      where: { tournamentId: cleanId },
    }).catch(() => {});
  }

  // 4. Clean up squads, stages, teams links
  await (prisma as any).tournamentSquad.deleteMany({
    where: { tournamentId: cleanId },
  }).catch(() => {});
  await (prisma as any).tournamentStage.deleteMany({
    where: { tournamentId: cleanId },
  }).catch(() => {});
  await (prisma as any).tournamentTeam.deleteMany({
    where: { tournamentId: cleanId },
  }).catch(() => {});

  // 5. Delete the tournament
  await (prisma as any).tournament.delete({
    where: { id: cleanId },
  });

  revalidatePath(`/${entryPath}/tournaments`);
  revalidatePath(`/${entryPath}/dashboard`);
  revalidatePath('/');
  return { success: true, redirectUrl: `/${entryPath}/tournaments` };
}

export async function addTournamentStageServerAction(tournamentId: string, formData: FormData) {
  await requireAdminAuth();
  if (!tournamentId || typeof tournamentId !== 'string') {
    throw new Error('Invalid tournament ID.');
  }
  const entryPath = getAdminEntryPath();

  const name = (formData.get('name') as string)?.trim() || 'Stage';
  const stageOrder = Math.max(1, parseInt(formData.get('stageOrder') as string, 10) || 1);
  const oversPerInnings = Math.min(Math.max(1, parseInt(formData.get('oversPerInnings') as string, 10) || 20), 50);
  const ballsPerOver = Math.min(Math.max(1, parseInt(formData.get('ballsPerOver') as string, 10) || 6), 6);
  const pointsForWin = parseInt(formData.get('pointsForWin') as string, 10) || 2;
  const pointsForTie = parseInt(formData.get('pointsForTie') as string, 10) || 1;
  const pointsForNoResult = parseInt(formData.get('pointsForNoResult') as string, 10) || 1;

  await (prisma as any).tournamentStage.create({
    data: {
      tournamentId: tournamentId.trim(),
      name,
      stageOrder,
      oversPerInnings,
      ballsPerOver,
      pointsForWin,
      pointsForTie,
      pointsForNoResult,
    },
  });

  revalidatePath(`/${entryPath}/tournaments/${tournamentId.trim()}`);
  revalidatePath(`/${entryPath}/tournaments`);
  return { success: true };
}
