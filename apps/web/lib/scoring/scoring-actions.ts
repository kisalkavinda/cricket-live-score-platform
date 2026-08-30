'use server';

import { requireAdminAuth } from '@/lib/auth/admin-auth';
import {
  createMatchSchema,
  startMatchSchema,
  openingLineupSchema,
  recordDeliverySchema,
  changeBowlerSchema,
  switchBatterSchema,
  completeMatchSchema,
  editBallDeliverySchema,
  startSuperOverSchema,
  updateMatchRulesSchema,
} from '@/lib/validations/scoring';
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
  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid match input: ${parsed.error.issues[0]?.message}`);
  }
  return await createMatch(parsed.data);
}

export async function startMatchAction(matchId: string, input: StartMatchInput) {
  await requireAdminAuth();
  if (!matchId || typeof matchId !== 'string') {
    throw new Error('Invalid match ID.');
  }
  const parsed = startMatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid start match input: ${parsed.error.issues[0]?.message}`);
  }
  return await startMatch(matchId.trim(), parsed.data);
}

export async function setOpeningLineupAction(inningsId: string, input: OpeningLineupInput) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  const parsed = openingLineupSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid lineup input: ${parsed.error.issues[0]?.message}`);
  }
  return await setInningsOpeningLineup(inningsId.trim(), parsed.data);
}

export async function recordDeliveryAction(inningsId: string, input: RecordDeliveryInput) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  const parsed = recordDeliverySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid delivery input: ${parsed.error.issues[0]?.message}`);
  }
  return await recordDelivery(inningsId.trim(), parsed.data);
}

export async function undoLastDeliveryAction(inningsId: string) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  return await undoLastDelivery(inningsId.trim());
}

export async function changeBowlerAction(inningsId: string, bowlerId: string) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  const parsed = changeBowlerSchema.safeParse({ bowlerId });
  if (!parsed.success) {
    throw new Error(`Invalid bowler: ${parsed.error.issues[0]?.message}`);
  }
  return await changeBowler(inningsId.trim(), parsed.data.bowlerId);
}

export async function swapStrikerAction(inningsId: string) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  return await swapStriker(inningsId.trim());
}

export async function switchBatterAction(inningsId: string, role: 'striker' | 'nonStriker', newPlayerId: string) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  const parsed = switchBatterSchema.safeParse({ role, newPlayerId });
  if (!parsed.success) {
    throw new Error(`Invalid batter switch: ${parsed.error.issues[0]?.message}`);
  }
  return await switchBatter(inningsId.trim(), parsed.data.role, parsed.data.newPlayerId);
}

export async function endInningsAction(inningsId: string) {
  await requireAdminAuth();
  if (!inningsId || typeof inningsId !== 'string') {
    throw new Error('Invalid innings ID.');
  }
  return await endInnings(inningsId.trim());
}

export async function completeMatchAction(matchId: string, input: { winnerTeamId?: string; resultNote?: string }) {
  await requireAdminAuth();
  if (!matchId || typeof matchId !== 'string') {
    throw new Error('Invalid match ID.');
  }
  const parsed = completeMatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid complete match input: ${parsed.error.issues[0]?.message}`);
  }
  return await completeMatch(matchId.trim(), parsed.data);
}

export async function editBallDeliveryAction(
  ballId: string,
  input: {
    runs?: number;
    extraType?: any;
    extras?: number;
    isWicket?: boolean;
    wicketType?: string;
  }
) {
  await requireAdminAuth();
  if (!ballId || typeof ballId !== 'string') {
    throw new Error('Invalid ball ID.');
  }
  const parsed = editBallDeliverySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid edit ball delivery input: ${parsed.error.issues[0]?.message}`);
  }
  const { editBallDelivery } = await import('./scoring-service');
  return await editBallDelivery(ballId.trim(), parsed.data);
}

export async function deleteBallDeliveryAction(ballId: string) {
  await requireAdminAuth();
  if (!ballId || typeof ballId !== 'string') {
    throw new Error('Invalid ball ID.');
  }
  const { deleteBallDelivery } = await import('./scoring-service');
  return await deleteBallDelivery(ballId.trim());
}

export async function startSuperOverAction(matchId: string, input: { battingFirstTeamId: string; ballsPerOver?: number }) {
  await requireAdminAuth();
  if (!matchId || typeof matchId !== 'string') {
    throw new Error('Invalid match ID.');
  }
  const parsed = startSuperOverSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid super over input: ${parsed.error.issues[0]?.message}`);
  }
  const { startSuperOver } = await import('./scoring-service');
  return await startSuperOver(matchId.trim(), parsed.data);
}

export async function updateMatchRulesAction(matchId: string, input: { oversPerInnings?: number; ballsPerOver?: number }) {
  await requireAdminAuth();
  if (!matchId || typeof matchId !== 'string') {
    throw new Error('Invalid match ID.');
  }
  const parsed = updateMatchRulesSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid match rules input: ${parsed.error.issues[0]?.message}`);
  }
  const { updateMatchRules } = await import('./scoring-service');
  return await updateMatchRules(matchId.trim(), parsed.data);
}

export async function deleteMatchAction(matchId: string) {
  await requireAdminAuth();
  if (!matchId || typeof matchId !== 'string') {
    throw new Error('Invalid match ID.');
  }
  const { getAdminEntryPath } = await import('@/lib/auth/admin-auth');
  const { revalidatePath } = await import('next/cache');
  const { prisma } = await import('database');
  const entryPath = getAdminEntryPath();

  try {
    const inningsList = await (prisma as any).innings.findMany({
      where: { matchId: matchId.trim() },
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
        where: { matchId: matchId.trim() },
      }).catch(() => {});
    }

    await (prisma as any).match.delete({
      where: { id: matchId.trim() },
    }).catch((err: any) => {
      if (err?.code !== 'P2025') throw err;
    });

    revalidatePath(`/${entryPath}/matches`);
    revalidatePath(`/${entryPath}/dashboard`);
    revalidatePath('/');
    return { success: true, redirectUrl: `/${entryPath}/matches` };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      revalidatePath(`/${entryPath}/matches`);
      return { success: true, redirectUrl: `/${entryPath}/matches` };
    }
    return { success: false, error: err.message || 'Failed to delete match.' };
  }
}
