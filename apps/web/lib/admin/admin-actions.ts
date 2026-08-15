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
import { prisma } from 'database';

export async function loginAdminServerAction(password: string) {
  return loginAdmin(password);
}

export async function logoutAdminServerAction() {
  await logoutAdmin();
}

export async function approveRegistrationServerAction(registrationId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const result = await approveRegistrationTransaction(registrationId, "PRIMARY_ADMIN");
  if (result.success) {
    revalidatePath(`/${entryPath}`);
    revalidatePath(`/${entryPath}/dashboard`);
    revalidatePath(`/${entryPath}/registrations`);
    revalidatePath(`/${entryPath}/registrations/${registrationId}`);
    revalidatePath(`/${entryPath}/teams`);
    revalidatePath(`/${entryPath}/players`);
    // Invalidate the public aggregate team-count cache ONLY after the
    // authoritative Supabase transaction has committed successfully.
    // This never runs on failure. Live scoring is completely unrelated.
    // Profile 'seconds' ensures near-immediate revalidation on next request.
    revalidateTag('teams-count', 'seconds');
  }
  return result;
}


export async function rejectRegistrationServerAction(registrationId: string, reason: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const result = await rejectRegistrationAction(registrationId, reason, "PRIMARY_ADMIN");
  if (result.success) {
    revalidatePath(`/${entryPath}`);
    revalidatePath(`/${entryPath}/dashboard`);
    revalidatePath(`/${entryPath}/registrations`);
    revalidatePath(`/${entryPath}/registrations/${registrationId}`);
  }
  return result;
}

export async function retryBackupServerAction(registrationId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const result = await retryBackupService(registrationId, "PRIMARY_ADMIN");
  revalidatePath(`/${entryPath}/registrations/${registrationId}`);
  return result;
}

export async function createExceptionServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const tournamentId = formData.get('tournamentId') as string;
  const name = formData.get('name') as string;
  const teamName = formData.get('teamName') as string;
  const indexPrefix = formData.get('indexPrefix') as string;
  const minPlayers = parseInt(formData.get('minPlayers') as string, 10) || 7;
  const notes = formData.get('notes') as string;

  await createException({
    tournamentId,
    name,
    teamName,
    indexPrefix,
    minPlayers,
    notes,
  }, "PRIMARY_ADMIN");

  revalidatePath(`/${entryPath}/registration-exceptions`);
  redirect(`/${entryPath}/registration-exceptions`);
}

export async function toggleExceptionServerAction(id: string, active: boolean) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  await toggleExceptionStatus(id, active, "PRIMARY_ADMIN");
  revalidatePath(`/${entryPath}/registration-exceptions`);
}

export async function createTeamServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const name = formData.get('name') as string;
  const shortName = formData.get('shortName') as string;
  const city = formData.get('city') as string;
  const logoUrl = formData.get('logoUrl') as string | null;

  await prisma.team.create({
    data: {
      name,
      shortName,
      city,
      logoUrl,
    },
  });

  revalidatePath(`/${entryPath}/teams`);
  redirect(`/${entryPath}/teams`);
}

export async function createPlayerServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const name = formData.get('name') as string;
  const indexNumber = (formData.get('indexNumber') as string) || null;
  const role = (formData.get('role') as any) || 'ALL_ROUNDER';
  const battingStyle = (formData.get('battingStyle') as string) || null;
  const bowlingStyle = (formData.get('bowlingStyle') as string) || null;
  const profileImageUrl = formData.get('profileImageUrl') as string | null;

  await (prisma as any).player.create({
    data: {
      name: name?.trim(),
      indexNumber: indexNumber ? indexNumber.trim().toUpperCase() : null,
      role,
      battingStyle: battingStyle ? battingStyle.trim() : null,
      bowlingStyle: bowlingStyle ? bowlingStyle.trim() : null,
      profileImageUrl,
    },
  });

  revalidatePath(`/${entryPath}/players`);
  redirect(`/${entryPath}/players`);
}

export async function createTournamentServerAction(formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();
  const name = formData.get('name') as string;
  const season = formData.get('season') as string;
  const format = formData.get('format') as string;
  const oversPerInnings = parseInt(formData.get('oversPerInnings') as string, 10);
  const ballsPerOver = parseInt(formData.get('ballsPerOver') as string, 10);

  await prisma.tournament.create({
    data: {
      name,
      season,
      format,
      stages: {
        create: [
          {
            name: "Group Stage",
            stageOrder: 1,
            oversPerInnings,
            ballsPerOver,
          }
        ]
      }
    },
  });

  revalidatePath(`/${entryPath}/tournaments`);
  redirect(`/${entryPath}/tournaments`);
}

export async function addPlayerToTeamServerAction(teamId: string, playerId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  await (prisma as any).teamPlayer.upsert({
    where: {
      teamId_playerId: {
        teamId,
        playerId,
      },
    },
    update: {},
    create: {
      teamId,
      playerId,
    },
  });

  revalidatePath(`/${entryPath}/teams/${teamId}`);
  revalidatePath(`/${entryPath}/teams`);
}

export async function removePlayerFromTeamServerAction(teamPlayerId: string, teamId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  await (prisma as any).teamPlayer.delete({
    where: { id: teamPlayerId },
  });

  revalidatePath(`/${entryPath}/teams/${teamId}`);
  revalidatePath(`/${entryPath}/teams`);
}

export async function createAndAssignPlayerServerAction(teamId: string, formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const name = formData.get('name') as string;
  const role = (formData.get('role') as any) || 'BATTER';
  const indexNumber = (formData.get('indexNumber') as string) || null;
  const battingStyle = formData.get('battingStyle') as string;
  const bowlingStyle = formData.get('bowlingStyle') as string;

  if (!name || !name.trim()) {
    throw new Error('Player name is required.');
  }

  const player = await (prisma as any).player.create({
    data: {
      name: name.trim(),
      role,
      indexNumber: indexNumber ? indexNumber.trim().toUpperCase() : null,
      battingStyle: battingStyle ? battingStyle.trim() : null,
      bowlingStyle: bowlingStyle ? bowlingStyle.trim() : null,
      teamPlayers: {
        create: [
          { teamId },
        ],
      },
    },
  });

  revalidatePath(`/${entryPath}/teams/${teamId}`);
  revalidatePath(`/${entryPath}/teams`);
  revalidatePath(`/${entryPath}/players`);
  return { success: true, playerId: player.id };
}

export async function updateTournamentServerAction(tournamentId: string, formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const name = formData.get('name') as string;
  const season = formData.get('season') as string;
  const format = formData.get('format') as string;
  const status = formData.get('status') as any;

  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: {
      name,
      season,
      format,
      status,
    },
  });

  revalidatePath(`/${entryPath}/tournaments/${tournamentId}`);
  revalidatePath(`/${entryPath}/tournaments`);
  return { success: true };
}

export async function addTournamentStageServerAction(tournamentId: string, formData: FormData) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const name = formData.get('name') as string;
  const stageOrder = parseInt(formData.get('stageOrder') as string, 10) || 1;
  const oversPerInnings = parseInt(formData.get('oversPerInnings') as string, 10) || 20;
  const ballsPerOver = parseInt(formData.get('ballsPerOver') as string, 10) || 6;
  const pointsForWin = parseInt(formData.get('pointsForWin') as string, 10) || 2;
  const pointsForTie = parseInt(formData.get('pointsForTie') as string, 10) || 1;
  const pointsForNoResult = parseInt(formData.get('pointsForNoResult') as string, 10) || 1;

  await (prisma as any).tournamentStage.create({
    data: {
      tournamentId,
      name,
      stageOrder,
      oversPerInnings,
      ballsPerOver,
      pointsForWin,
      pointsForTie,
      pointsForNoResult,
    },
  });

  revalidatePath(`/${entryPath}/tournaments/${tournamentId}`);
  revalidatePath(`/${entryPath}/tournaments`);
  return { success: true };
}


