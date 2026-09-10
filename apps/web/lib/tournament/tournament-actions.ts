'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAuth, getAdminEntryPath } from '@/lib/auth/admin-auth';
import {
  assignTeamsToGroups,
  unassignAllTeams,
  generateGroupStageFixtures,
  checkAndAdvanceTournament,
  recalculateTournamentStandings,
} from './tournament-service';
import { prisma } from 'database';

export async function assignTeamsToGroupsAction(
  tournamentId: string,
  assignments: Record<string, 'GROUP_A' | 'GROUP_B'>,
  positions?: Record<string, number>
) {
  try {
    await requireAdminAuth();
    const entryPath = getAdminEntryPath();

    const result = await assignTeamsToGroups(tournamentId, assignments, positions);
    if (result.success) {
      revalidatePath(`/${entryPath}/tournament-bracket`);
      revalidatePath('/tournament');
      revalidatePath('/');
    }
    return result;
  } catch (err: any) {
    console.error('[assignTeamsToGroupsAction] error:', err);
    return { success: false, error: err.message || 'Failed to assign teams to groups.' };
  }
}

export async function unassignAllTeamsAction(tournamentId: string) {
  try {
    await requireAdminAuth();
    const entryPath = getAdminEntryPath();

    const result = await unassignAllTeams(tournamentId);
    if (result.success) {
      revalidatePath(`/${entryPath}/tournament-bracket`);
      revalidatePath('/tournament');
      revalidatePath('/');
    }
    return result;
  } catch (err: any) {
    console.error('[unassignAllTeamsAction] error:', err);
    return { success: false, error: err.message || 'Failed to unassign teams.' };
  }
}

export async function configureTournamentStagesAction(
  tournamentId: string,
  settings: {
    ballsPerOver?: number;
    groupOvers?: number;
    qualificationOvers?: number;
    wildcardOvers?: number; // legacy alias
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
    qualificationOvers?: number;
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
