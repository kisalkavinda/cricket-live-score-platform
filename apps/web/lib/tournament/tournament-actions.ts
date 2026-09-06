'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  assignTeamsToGroups,
  generateGroupStageFixtures,
  checkAndAdvanceTournament,
  recalculateTournamentStandings,
} from './tournament-service';
import { prisma } from 'database';

export async function assignTeamsToGroupsAction(
  tournamentId: string,
  assignments: Record<string, 'GROUP_A' | 'GROUP_B' | 'GROUP_C'>
) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const result = await assignTeamsToGroups(tournamentId, assignments);
  if (result.success) {
    revalidatePath(`/${entryPath}/tournament-bracket`);
    revalidatePath('/tournament');
    revalidatePath('/');
  }
  return result;
}

export async function configureTournamentStagesAction(
  tournamentId: string,
  settings: {
    ballsPerOver?: number;
    groupOvers?: number;
    wildcardOvers?: number;
    playoffOvers?: number;
    finalOvers?: number;
  }
) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const { configureTournamentStages } = await import('./tournament-service');
  const result = await configureTournamentStages(tournamentId, settings);
  if (result.success) {
    revalidatePath(`/${entryPath}/tournament-bracket`);
    revalidatePath('/tournament');
  }
  return result;
}

export async function resetTournamentAction(
  tournamentId: string,
  confirmationText: string
) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const { resetTournamentFixtures } = await import('./tournament-service');
  const result = await resetTournamentFixtures(tournamentId, confirmationText);
  if (result.success) {
    revalidatePath(`/${entryPath}/tournament-bracket`);
    revalidatePath(`/${entryPath}/matches`);
    revalidatePath('/tournament');
    revalidatePath('/');
  }
  return result;
}

export async function generateGroupFixturesAction(
  tournamentId: string,
  settings: {
    oversPerInnings?: number;
    ballsPerOver?: number;
    groupOvers?: number;
    wildcardOvers?: number;
    playoffOvers?: number;
    finalOvers?: number;
    venue?: string;
    startDate?: string;
  }
) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const result = await generateGroupStageFixtures(tournamentId, settings);
  if (result.success) {
    revalidatePath(`/${entryPath}/tournament-bracket`);
    revalidatePath(`/${entryPath}/matches`);
    revalidatePath('/tournament');
    revalidatePath('/');
  }
  return result;
}

export async function advanceTournamentAction(tournamentId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const result = await checkAndAdvanceTournament(tournamentId);
  revalidatePath(`/${entryPath}/tournament-bracket`);
  revalidatePath(`/${entryPath}/matches`);
  revalidatePath('/tournament');
  revalidatePath('/');
  return result;
}

export async function recalculateStandingsAction(tournamentId: string) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  const result = await recalculateTournamentStandings(tournamentId);
  revalidatePath(`/${entryPath}/tournament-bracket`);
  revalidatePath('/tournament');
  revalidatePath('/');
  return result;
}

export async function updateMatchScheduleAction(
  matchId: string,
  input: { scheduledAt?: string; venue?: string }
) {
  await requireAdminAuth();
  const entryPath = getAdminEntryPath();

  await (prisma as any).match.update({
    where: { id: matchId },
    data: {
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      venue: input.venue?.trim() || undefined,
    },
  });

  revalidatePath(`/${entryPath}/tournament-bracket`);
  revalidatePath(`/${entryPath}/matches`);
  revalidatePath('/tournament');
  return { success: true };
}
