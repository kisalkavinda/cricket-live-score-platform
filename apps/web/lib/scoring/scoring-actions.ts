'use server';

import { requireAdminAuth } from '@/lib/auth/admin-auth';
import {
  createMatch,
  startMatch,
  setInningsOpeningLineup,
  recordDelivery,
  undoLastDelivery,
  changeBowler,
  swapStriker,
  switchBatter,
  endInnings,
  completeMatch,
  CreateMatchInput,
  StartMatchInput,
  OpeningLineupInput,
  RecordDeliveryInput,
} from './scoring-service';

export async function createMatchAction(input: CreateMatchInput) {
  await requireAdminAuth();
  return await createMatch(input);
}

export async function startMatchAction(matchId: string, input: StartMatchInput) {
  await requireAdminAuth();
  return await startMatch(matchId, input);
}

export async function setOpeningLineupAction(inningsId: string, input: OpeningLineupInput) {
  await requireAdminAuth();
  return await setInningsOpeningLineup(inningsId, input);
}

export async function recordDeliveryAction(inningsId: string, input: RecordDeliveryInput) {
  await requireAdminAuth();
  return await recordDelivery(inningsId, input);
}

export async function undoLastDeliveryAction(inningsId: string) {
  await requireAdminAuth();
  return await undoLastDelivery(inningsId);
}

export async function changeBowlerAction(inningsId: string, bowlerId: string) {
  await requireAdminAuth();
  return await changeBowler(inningsId, bowlerId);
}

export async function swapStrikerAction(inningsId: string) {
  await requireAdminAuth();
  return await swapStriker(inningsId);
}

export async function switchBatterAction(inningsId: string, role: 'striker' | 'nonStriker', newPlayerId: string) {
  await requireAdminAuth();
  return await switchBatter(inningsId, role, newPlayerId);
}

export async function endInningsAction(inningsId: string) {
  await requireAdminAuth();
  return await endInnings(inningsId);
}

export async function completeMatchAction(matchId: string, input: { winnerTeamId?: string; resultNote?: string }) {
  await requireAdminAuth();
  return await completeMatch(matchId, input);
}
