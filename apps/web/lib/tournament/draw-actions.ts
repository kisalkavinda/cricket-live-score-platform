'use server';

import { requireAdminAuth } from '@/lib/auth/admin-auth';
import {
  generateDraw,
  startCeremony,
  pauseCeremony,
  resumeCeremony,
  cancelDraw,
  finalizeDraw,
  selectChit,
  verifyDrawCommitment,
  getDrawState,
} from './draw-service';
import { prisma } from 'database';

export async function generateDrawAction(tournamentId: string, selectedTeamIds?: string[]) {
  const session = await requireAdminAuth();
  try {
    const result = await generateDraw(tournamentId, session.username, selectedTeamIds);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate draw.' };
  }
}

export async function startCeremonyAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const result = await startCeremony(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start ceremony.' };
  }
}

export async function pauseCeremonyAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const result = await pauseCeremony(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to pause ceremony.' };
  }
}

export async function resumeCeremonyAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const result = await resumeCeremony(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resume ceremony.' };
  }
}

export async function cancelDrawAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const result = await cancelDraw(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to cancel draw.' };
  }
}

export async function revertFinalizedDrawAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const { revertFinalizedDraw } = await import('./draw-service');
    const result = await revertFinalizedDraw(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to revert finalized draw.' };
  }
}

export async function finalizeDrawAction(drawId: string) {
  const session = await requireAdminAuth();
  try {
    const result = await finalizeDraw(drawId, session.username);
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize draw.' };
  }
}

/**
 * Admin proxy selection (for ceremony host monitoring or assistance).
 */
export async function adminSelectChitAction(drawId: string, chitPosition: number) {
  const session = await requireAdminAuth();
  try {
    const result = await selectChit(drawId, chitPosition, {
      isAdmin: true,
      actor: `Admin (${session.username})`,
    });
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to select chit.' };
  }
}

/**
 * Captain authenticated selection using secure draw pass code.
 * Safe for public / mobile ceremony invocation.
 */
export async function captainSelectChitAction(
  drawId: string,
  chitPosition: number,
  passcode: string
) {
  try {
    if (!passcode || !passcode.trim()) {
      return { success: false, error: 'Captain passcode is required.' };
    }

    const result = await selectChit(drawId, chitPosition, {
      passcode: passcode.trim(),
      actor: 'Captain',
    });
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to select chit.' };
  }
}

/**
 * Fetch current sanitized draw state.
 */
export async function fetchDrawStateAction(tournamentId: string) {
  try {
    const state = await getDrawState(tournamentId);
    return { success: true, draw: state };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch draw state.' };
  }
}

/**
 * Independent cryptographic verification of the draw commitment.
 */
export async function verifyDrawCommitmentAction(drawId: string) {
  try {
    const result = await verifyDrawCommitment(drawId);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Commitment verification failed.' };
  }
}

/**
 * Helper to ensure a 9th official team is attached to the tournament if exactly 8 are present.
 */
export async function attachTeamToTournamentAction(tournamentId: string, teamId: string) {
  await requireAdminAuth();
  try {
    await (prisma as any).tournamentTeam.upsert({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId,
        },
      },
      update: {},
      create: {
        tournamentId,
        teamId,
      },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
