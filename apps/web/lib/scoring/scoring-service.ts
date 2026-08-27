import "server-only";

import { prisma } from 'database';
import { requireAdminAuth } from '@/lib/auth/admin-auth';
import { broadcastScoreUpdate, ScoreBroadcastPayload } from './scoring-realtime';

export type MatchStatusType = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';
export type InningsStatusType = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ExtraTypeValue = 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';
export type WicketTypeValue =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'TIMED_OUT'
  | 'RETIRED_HURT'
  | 'OTHER';

export interface CreateMatchInput {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  venue?: string;
  scheduledAt?: string | Date;
  oversPerInnings?: number;
}

export interface StartMatchInput {
  tossWinnerId: string;
  tossDecision: 'BAT' | 'BOWL';
}

export interface OpeningLineupInput {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

export interface RecordDeliveryInput {
  runs?: number;
  extraType?: ExtraTypeValue;
  extraRuns?: number;
  isWicket?: boolean;
  wicketType?: WicketTypeValue;
  dismissedPlayerId?: string;
  newBatterId?: string;
  commentary?: string;
  expectedUpdatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUERY FUNCTIONS (Read-only, Fresh PostgreSQL data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all matches grouped by status.
 */
export async function getMatchesList() {
  const matches = await (prisma as any).match.findMany({
    orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      status: true,
      currentInnings: true,
      oversPerInnings: true,
      venue: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      resultNote: true,
      tossDecision: true,
      tossWinnerId: true,
      winnerTeamId: true,
      tournament: { select: { id: true, name: true } },
      teamA: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      tossWinner: { select: { id: true, name: true, shortName: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
      innings: {
        orderBy: { inningsNumber: 'asc' },
        select: {
          id: true,
          inningsNumber: true,
          runs: true,
          wickets: true,
          overs: true,
          balls: true,
          status: true,
          battingTeam: { select: { id: true, name: true, shortName: true } },
          bowlingTeam: { select: { id: true, name: true, shortName: true } },
        },
      },
    },
  });

  return matches;
}


/**
 * Returns a single match with full details for scoring console or detailed overview.
 */
export async function getMatchDetail(matchId: string) {
  const match = await (prisma as any).match.findUnique({
    where: { id: matchId },
    include: {
      teamA: {
        include: {
          teamPlayers: { include: { player: true } },
        },
      },
      teamB: {
        include: {
          teamPlayers: { include: { player: true } },
        },
      },
      tossWinner: true,
      winnerTeam: true,
      innings: {
        orderBy: { inningsNumber: 'asc' },
        include: {
          battingTeam: true,
          bowlingTeam: true,
          currentStriker: true,
          currentNonStriker: true,
          currentBowler: true,
          battingScores: {
            include: { player: true },
            orderBy: { battingOrder: 'asc' },
          },
          bowlingScores: {
            include: { player: true },
            orderBy: { createdAt: 'asc' },
          },
          ballEvents: {
            take: 36,
            orderBy: { createdAt: 'desc' },
            include: {
              batsman: true,
              bowler: true,
              dismissedPlayer: true,
            },
          },
        },
      },
    },
  });

  return match;
}

/**
 * Returns active live matches for the public LiveScoreWidget.
 * Falls back to latest upcoming or recently completed match if none is LIVE.
 */
export async function getLiveMatches() {
  const liveMatches = await (prisma as any).match.findMany({
    where: { status: 'LIVE' },
    orderBy: { startedAt: 'desc' },
    include: {
      teamA: true,
      teamB: true,
      tossWinner: true,
      winnerTeam: true,
      innings: {
        orderBy: { inningsNumber: 'asc' },
        include: {
          battingTeam: true,
          bowlingTeam: true,
          currentStriker: true,
          currentNonStriker: true,
          currentBowler: true,
          battingScores: { include: { player: true }, orderBy: { battingOrder: 'asc' } },
          bowlingScores: { include: { player: true } },
          ballEvents: { take: 6, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });

  if (liveMatches.length > 0) {
    return liveMatches;
  }

  // Fallback: return upcoming or completed matches
  return await (prisma as any).match.findMany({
    take: 3,
    orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      teamA: true,
      teamB: true,
      tossWinner: true,
      winnerTeam: true,
      innings: {
        orderBy: { inningsNumber: 'asc' },
        include: {
          battingTeam: true,
          bowlingTeam: true,
          currentStriker: true,
          currentNonStriker: true,
          currentBowler: true,
          battingScores: { include: { player: true }, orderBy: { battingOrder: 'asc' } },
          bowlingScores: { include: { player: true } },
          ballEvents: { take: 120, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
}

/**
 * Builds the broadcast payload from PostgreSQL for real-time distribution.
 */
export async function buildMatchBroadcastPayload(matchOrId: string | any): Promise<ScoreBroadcastPayload | null> {
  const match = typeof matchOrId === 'string' ? await getMatchDetail(matchOrId) : matchOrId;
  if (!match) return null;


  const currentInnings = match.innings.find((i: any) => i.inningsNumber === match.currentInnings) || match.innings[0] || null;

  let striker = null;
  let nonStriker = null;
  let bowler = null;
  let crr = '0.00';
  let rrr = undefined;
  let target = undefined;

  if (currentInnings) {
    const totalOversDecimal = currentInnings.overs + currentInnings.balls / 6;
    if (totalOversDecimal > 0) {
      crr = (currentInnings.runs / totalOversDecimal).toFixed(2);
    }

    if (currentInnings.inningsNumber === 2) {
      const inn1 = match.innings.find((i: any) => i.inningsNumber === 1);
      if (inn1) {
        target = inn1.runs + 1;
        const runsNeeded = target - currentInnings.runs;
        const totalBallsPossible = match.oversPerInnings * 6;
        const ballsBowled = currentInnings.overs * 6 + currentInnings.balls;
        const ballsRemaining = Math.max(0, totalBallsPossible - ballsBowled);
        if (ballsRemaining > 0 && runsNeeded > 0) {
          rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
        }
      }
    }

    const strikerScore = currentInnings.battingScores.find(
      (b: any) => b.playerId === currentInnings.currentStrikerId
    );
    if (strikerScore) {
      const sr = strikerScore.balls > 0 ? ((strikerScore.runs / strikerScore.balls) * 100).toFixed(1) : '0.0';
      striker = {
        id: strikerScore.player.id,
        name: strikerScore.player.name,
        runs: strikerScore.runs,
        balls: strikerScore.balls,
        fours: strikerScore.fours,
        sixes: strikerScore.sixes,
        sr,
      };
    }

    const nonStrikerScore = currentInnings.battingScores.find(
      (b: any) => b.playerId === currentInnings.currentNonStrikerId
    );
    if (nonStrikerScore) {
      const sr = nonStrikerScore.balls > 0 ? ((nonStrikerScore.runs / nonStrikerScore.balls) * 100).toFixed(1) : '0.0';
      nonStriker = {
        id: nonStrikerScore.player.id,
        name: nonStrikerScore.player.name,
        runs: nonStrikerScore.runs,
        balls: nonStrikerScore.balls,
        fours: nonStrikerScore.fours,
        sixes: nonStrikerScore.sixes,
        sr,
      };
    }

    const bowlerScore = currentInnings.bowlingScores.find(
      (b: any) => b.playerId === currentInnings.currentBowlerId
    );
    if (bowlerScore) {
      const oversDecimal = bowlerScore.overs + bowlerScore.balls / 6;
      const econ = oversDecimal > 0 ? (bowlerScore.runsConceded / oversDecimal).toFixed(2) : '0.00';
      bowler = {
        id: bowlerScore.player.id,
        name: bowlerScore.player.name,
        overs: `${bowlerScore.overs}.${bowlerScore.balls}`,
        maidens: bowlerScore.maidens,
        runsConceded: bowlerScore.runsConceded,
        wickets: bowlerScore.wickets,
        econ,
        wides: bowlerScore.wides,
        noBalls: bowlerScore.noBalls,
      };
    }
  }

  const recentBalls = (currentInnings?.ballEvents || []).slice(0, 8).map((b: any) => {
    let display = `${b.runs}`;
    if (b.isWicket) {
      display = 'W';
    } else if (b.extraType === 'WIDE') {
      display = b.runs > 0 ? `WD+${b.runs}` : 'WD';
    } else if (b.extraType === 'NO_BALL') {
      display = b.runs > 0 ? `NB+${b.runs}` : 'NB';
    } else if (b.extraType === 'BYE') {
      display = `B${b.extras || b.runs}`;
    } else if (b.extraType === 'LEG_BYE') {
      display = `LB${b.extras || b.runs}`;
    }
    return {
      id: b.id,
      overNumber: b.overNumber,
      ballNumber: b.ballNumber,
      runs: b.runs,
      extras: b.extras,
      extraType: b.extraType,
      isLegal: b.isLegal,
      isWicket: b.isWicket,
      wicketType: b.wicketType,
      display,
    };
  });

  return {
    matchId: match.id,
    status: match.status,
    currentInnings: match.currentInnings,
    match: {
      id: match.id,
      teamA: { id: match.teamA.id, name: match.teamA.name, shortName: match.teamA.shortName, logoUrl: match.teamA.logoUrl },
      teamB: { id: match.teamB.id, name: match.teamB.name, shortName: match.teamB.shortName, logoUrl: match.teamB.logoUrl },
      venue: match.venue,
      oversPerInnings: match.oversPerInnings,
      resultNote: match.resultNote,
      winnerTeamId: match.winnerTeamId,
    },
    innings: currentInnings
      ? {
          id: currentInnings.id,
          inningsNumber: currentInnings.inningsNumber,
          battingTeam: {
            id: currentInnings.battingTeam.id,
            name: currentInnings.battingTeam.name,
            shortName: currentInnings.battingTeam.shortName,
            logoUrl: currentInnings.battingTeam.logoUrl,
          },
          bowlingTeam: {
            id: currentInnings.bowlingTeam.id,
            name: currentInnings.bowlingTeam.name,
            shortName: currentInnings.bowlingTeam.shortName,
            logoUrl: currentInnings.bowlingTeam.logoUrl,
          },
          runs: currentInnings.runs,
          wickets: currentInnings.wickets,
          overs: currentInnings.overs,
          balls: currentInnings.balls,
          status: currentInnings.status,
          crr,
          rrr,
          target,
        }
      : null,
    striker,
    nonStriker,
    bowler,
    recentBalls,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MUTATION FUNCTIONS (Admin Only, Fully Authoritative & Realtime Broadcast)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new match in UPCOMING state.
 */
export async function createMatch(input: CreateMatchInput) {
  const session = await requireAdminAuth();

  if (input.teamAId === input.teamBId) {
    return { success: false, error: 'Team A and Team B cannot be the same team.' };
  }

  const [tournament, teamA, teamB] = await Promise.all([
    (prisma as any).tournament.findUnique({ where: { id: input.tournamentId } }),
    (prisma as any).team.findUnique({ where: { id: input.teamAId } }),
    (prisma as any).team.findUnique({ where: { id: input.teamBId } }),
  ]);

  if (!tournament || !teamA || !teamB) {
    return { success: false, error: 'Invalid tournament or team selection.' };
  }

  const match = await (prisma as any).match.create({
    data: {
      tournamentId: input.tournamentId,
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      venue: input.venue?.trim() || 'Main Ground',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      oversPerInnings: input.oversPerInnings || 20,
      status: 'UPCOMING',
      currentInnings: 1,
    },
  });

  await (prisma as any).adminAuditLog.create({
    data: {
      action: 'MATCH_CREATED',
      entityType: 'Match',
      entityId: match.id,
      description: `Created match between ${teamA.name} and ${teamB.name} (${input.oversPerInnings || 20} overs).`,
      performedBy: session.username,
      metadata: { matchId: match.id, teamAId: teamA.id, teamBId: teamB.id },
    },
  });

  return { success: true, matchId: match.id };
}

/**
 * Starts a match: sets toss, status=LIVE, and creates Innings 1 in IN_PROGRESS state.
 */
export async function startMatch(matchId: string, input: StartMatchInput) {
  const session = await requireAdminAuth();

  const match = await (prisma as any).match.findUnique({
    where: { id: matchId },
    include: { teamA: true, teamB: true, innings: true },
  });

  if (!match) return { success: false, error: 'Match not found.' };
  if (match.status === 'COMPLETED') return { success: false, error: 'Match is already completed.' };
  if (input.tossWinnerId !== match.teamAId && input.tossWinnerId !== match.teamBId) {
    return { success: false, error: 'Toss winner must be one of the playing teams.' };
  }

  let battingTeamId = match.teamAId;
  let bowlingTeamId = match.teamBId;

  if (input.tossWinnerId === match.teamAId) {
    battingTeamId = input.tossDecision === 'BAT' ? match.teamAId : match.teamBId;
    bowlingTeamId = input.tossDecision === 'BAT' ? match.teamBId : match.teamAId;
  } else {
    battingTeamId = input.tossDecision === 'BAT' ? match.teamBId : match.teamAId;
    bowlingTeamId = input.tossDecision === 'BAT' ? match.teamAId : match.teamBId;
  }

  // Create Innings 1 if it doesn't already exist
  let inn1 = match.innings.find((i: any) => i.inningsNumber === 1);
  if (!inn1) {
    inn1 = await (prisma as any).innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId,
        bowlingTeamId,
        status: 'IN_PROGRESS',
      },
    });
  } else {
    await (prisma as any).innings.update({
      where: { id: inn1.id },
      data: {
        battingTeamId,
        bowlingTeamId,
        status: 'IN_PROGRESS',
      },
    });
  }

  await (prisma as any).match.update({
    where: { id: matchId },
    data: {
      status: 'LIVE',
      startedAt: match.startedAt || new Date(),
      tossWinnerId: input.tossWinnerId,
      tossDecision: input.tossDecision,
      currentInnings: 1,
    },
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'MATCH_STARTED',
      entityType: 'Match',
      entityId: match.id,
      description: `Started match. Toss won by ${input.tossWinnerId === match.teamAId ? match.teamA.name : match.teamB.name} (Elected to ${input.tossDecision}).`,
      performedBy: session.username,
      metadata: { matchId, tossWinnerId: input.tossWinnerId, tossDecision: input.tossDecision },
    },
  }).catch(() => {});

  // Broadcast realtime update concurrently
  buildMatchBroadcastPayload(matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, inningsId: inn1.id, updatedMatch: await getMatchDetail(matchId) };
}

/**
 * Sets the opening striker, non-striker, and opening bowler for an innings.
 */
export async function setInningsOpeningLineup(inningsId: string, input: OpeningLineupInput) {
  const session = await requireAdminAuth();

  if (input.strikerId === input.nonStrikerId) {
    return { success: false, error: 'Striker and non-striker cannot be the same player.' };
  }

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
    include: { match: true },
  });

  if (!innings) return { success: false, error: 'Innings not found.' };

  await prisma.$transaction(async (tx: any) => {
    // 1. Update Innings active players
    await tx.innings.update({
      where: { id: inningsId },
      data: {
        currentStrikerId: input.strikerId,
        currentNonStrikerId: input.nonStrikerId,
        currentBowlerId: input.bowlerId,
      },
    });

    // 2. Ensure InningsBatter records exist
    await tx.inningsBatter.upsert({
      where: { inningsId_playerId: { inningsId, playerId: input.strikerId } },
      create: {
        inningsId,
        playerId: input.strikerId,
        isStriker: true,
        battingOrder: 1,
      },
      update: { isStriker: true },
    });

    await tx.inningsBatter.upsert({
      where: { inningsId_playerId: { inningsId, playerId: input.nonStrikerId } },
      create: {
        inningsId,
        playerId: input.nonStrikerId,
        isStriker: false,
        battingOrder: 2,
      },
      update: { isStriker: false },
    });

    // 3. Ensure InningsBowler record exists
    await tx.inningsBowler.upsert({
      where: { inningsId_playerId: { inningsId, playerId: input.bowlerId } },
      create: {
        inningsId,
        playerId: input.bowlerId,
        isCurrent: true,
      },
      update: { isCurrent: true },
    });
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'LINEUP_CONFIGURED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Opening lineup set: Striker (${input.strikerId}), Non-Striker (${input.nonStrikerId}), Bowler (${input.bowlerId}).`,
      performedBy: session.username,
      metadata: { inningsId, ...input },
    },
  }).catch(() => {});

  // Broadcast realtime update concurrently
  buildMatchBroadcastPayload(innings.matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(innings.matchId) };
}

/**
 * Records a delivery atomically inside a Prisma transaction.
 * Handles normal runs, boundaries, wides, no-balls, byes, leg-byes, wickets, strike rotation,
 * over advancement, innings transitions, and match victory conditions.
 */
export async function recordDelivery(inningsId: string, input: RecordDeliveryInput) {
  const session = await requireAdminAuth();

  const runs = Number(input.runs || 0);
  const extraType: ExtraTypeValue = input.extraType || 'NONE';
  const extraRuns = Number(input.extraRuns || 0);
  const isWicket = Boolean(input.isWicket);
  const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL';

  // Total runs added to innings total score
  let totalBallRuns = 0;
  if (extraType === 'NONE') {
    totalBallRuns = runs;
  } else if (extraType === 'WIDE' || extraType === 'NO_BALL') {
    totalBallRuns = (extraRuns > 0 ? extraRuns : 1) + runs;
  } else if (extraType === 'BYE' || extraType === 'LEG_BYE') {
    totalBallRuns = extraRuns > 0 ? extraRuns : runs > 0 ? runs : 1;
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Authoritative reload
    const innings = await tx.innings.findUnique({
      where: { id: inningsId },
      include: {
        match: {
          include: {
            innings: { orderBy: { inningsNumber: 'asc' } },
          },
        },
        currentStriker: true,
        currentNonStriker: true,
        currentBowler: true,
      },
    });

    if (!innings) throw new Error('Innings not found.');
    if (innings.match.status !== 'LIVE') throw new Error(`Cannot score on a match with status ${innings.match.status}.`);
    if (innings.status !== 'IN_PROGRESS') throw new Error(`Innings is ${innings.status}.`);
    if (!innings.currentStrikerId || !innings.currentNonStrikerId || !innings.currentBowlerId) {
      throw new Error('Please set the striker, non-striker, and bowler before recording deliveries.');
    }

    const strikerId = innings.currentStrikerId;
    const nonStrikerId = innings.currentNonStrikerId;
    const bowlerId = innings.currentBowlerId;

    // 2. Compute updated over and legal ball count
    let nextOvers = innings.overs;
    let nextBalls = innings.balls;
    let isOverComplete = false;

    if (isLegal) {
      if (nextBalls === 5) {
        nextOvers += 1;
        nextBalls = 0;
        isOverComplete = true;
      } else {
        nextBalls += 1;
      }
    }

    const nextRuns = innings.runs + totalBallRuns;
    const nextWickets = innings.wickets + (isWicket ? 1 : 0);

    // 3. Update Batter statistics
    if (extraType !== 'WIDE') {
      const batterRunsOffBat = (extraType === 'BYE' || extraType === 'LEG_BYE') ? 0 : runs;
      const isFour = batterRunsOffBat === 4;
      const isSix = batterRunsOffBat === 6;

      await tx.inningsBatter.upsert({
        where: { inningsId_playerId: { inningsId, playerId: strikerId } },
        create: {
          inningsId,
          playerId: strikerId,
          runs: batterRunsOffBat,
          balls: 1,
          fours: isFour ? 1 : 0,
          sixes: isSix ? 1 : 0,
          isStriker: true,
        },
        update: {
          runs: { increment: batterRunsOffBat },
          balls: { increment: 1 },
          fours: { increment: isFour ? 1 : 0 },
          sixes: { increment: isSix ? 1 : 0 },
          isStriker: true,
        },
      });
    }

    // 4. Update Bowler statistics
    const bowlerRunsCharged = (extraType === 'BYE' || extraType === 'LEG_BYE') ? 0 : totalBallRuns;
    const bowlerWicketCredited = isWicket && input.wicketType !== 'RUN_OUT' && input.wicketType !== 'TIMED_OUT' && input.wicketType !== 'RETIRED_HURT';

    await tx.inningsBowler.upsert({
      where: { inningsId_playerId: { inningsId, playerId: bowlerId } },
      create: {
        inningsId,
        playerId: bowlerId,
        overs: isLegal && nextBalls === 0 ? 1 : 0,
        balls: isLegal ? (nextBalls === 0 ? 0 : 1) : 0,
        runsConceded: bowlerRunsCharged,
        wickets: bowlerWicketCredited ? 1 : 0,
        wides: extraType === 'WIDE' ? (extraRuns > 0 ? extraRuns : 1) : 0,
        noBalls: extraType === 'NO_BALL' ? (extraRuns > 0 ? extraRuns : 1) : 0,
        isCurrent: true,
      },
      update: {
        overs: isLegal && isOverComplete ? { increment: 1 } : undefined,
        balls: isLegal ? (isOverComplete ? 0 : { increment: 1 }) : undefined,
        runsConceded: { increment: bowlerRunsCharged },
        wickets: bowlerWicketCredited ? { increment: 1 } : undefined,
        wides: extraType === 'WIDE' ? { increment: extraRuns > 0 ? extraRuns : 1 } : undefined,
        noBalls: extraType === 'NO_BALL' ? { increment: extraRuns > 0 ? extraRuns : 1 } : undefined,
        isCurrent: true,
      },
    });

    // 5. Handle Wicket / Dismissal details
    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;
    const dismissedPlayerId = input.dismissedPlayerId || strikerId;

    if (isWicket) {
      let dismissalText = 'out';
      const bowlerName = innings.currentBowler?.name || 'Bowler';
      if (input.wicketType === 'RUN_OUT') {
        dismissalText = 'run out';
      } else if (input.wicketType === 'TIMED_OUT') {
        dismissalText = 'timed out';
      } else if (input.wicketType === 'RETIRED_HURT') {
        dismissalText = 'retired hurt';
      } else if (input.wicketType === 'BOWLED') {
        dismissalText = `b ${bowlerName}`;
      } else if (input.wicketType === 'LBW') {
        dismissalText = `lbw b ${bowlerName}`;
      } else if (input.wicketType === 'CAUGHT') {
        dismissalText = `c b ${bowlerName}`;
      } else if (input.wicketType === 'STUMPED') {
        dismissalText = `st b ${bowlerName}`;
      } else if (input.wicketType === 'HIT_WICKET') {
        dismissalText = `hit wicket b ${bowlerName}`;
      } else if (input.wicketType) {
        dismissalText = input.wicketType.toLowerCase().replace(/_/g, ' ');
      }

      // Guarantee dismissed player record exists with isOut: true
      await tx.inningsBatter.upsert({
        where: { inningsId_playerId: { inningsId, playerId: dismissedPlayerId } },
        create: {
          inningsId,
          playerId: dismissedPlayerId,
          runs: 0,
          balls: (extraType !== 'WIDE' && dismissedPlayerId === strikerId) ? 1 : 0,
          fours: 0,
          sixes: 0,
          isOut: true,
          dismissal: dismissalText,
          isStriker: false,
        },
        update: {
          isOut: true,
          dismissal: dismissalText,
          isStriker: false,
        },
      });

      // Determine next incoming batter
      let incomingBatterId = input.newBatterId;
      if (!incomingBatterId && nextWickets < 10) {
        const existingBatters = await tx.inningsBatter.findMany({
          where: { inningsId },
          select: { playerId: true },
        });
        const activeOrOutIds = new Set(existingBatters.map((b: any) => b.playerId));
        activeOrOutIds.add(strikerId);
        activeOrOutIds.add(nonStrikerId);
        activeOrOutIds.add(dismissedPlayerId);

        const allBattingTeamPlayers = await tx.player.findMany({
          where: { teamId: innings.battingTeamId },
          select: { id: true },
        });
        const available = allBattingTeamPlayers.filter((p: any) => !activeOrOutIds.has(p.id));
        if (available.length > 0) {
          incomingBatterId = available[0].id;
        }
      }

      if (incomingBatterId) {
        const batterCount = await tx.inningsBatter.count({ where: { inningsId } });
        await tx.inningsBatter.upsert({
          where: { inningsId_playerId: { inningsId, playerId: incomingBatterId } },
          create: {
            inningsId,
            playerId: incomingBatterId,
            battingOrder: batterCount + 1,
            isStriker: dismissedPlayerId === strikerId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
          },
          update: {
            isStriker: dismissedPlayerId === strikerId,
          },
        });

        if (dismissedPlayerId === strikerId) {
          nextStrikerId = incomingBatterId;
        } else {
          nextNonStrikerId = incomingBatterId;
        }
      }
    }

    // 6. Strike rotation
    // Odd runs completed rotates strike
    const physicalRunsTaken = runs;
    if (physicalRunsTaken % 2 !== 0) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // Over completion rotates strike at end of over
    if (isOverComplete) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    // 7. Check match completion / target chase
    let inningsFinished = false;
    let matchFinished = false;
    let resultNote = innings.match.resultNote;
    let winnerTeamId = innings.match.winnerTeamId;

    // Innings 2 chase logic
    if (innings.inningsNumber === 2) {
      const inn1 = innings.match.innings.find((i: any) => i.inningsNumber === 1);
      const target = (inn1?.runs || 0) + 1;
      if (nextRuns >= target) {
        // Batting team wins
        matchFinished = true;
        inningsFinished = true;
        winnerTeamId = innings.battingTeamId;
        const wicketsRemaining = 10 - nextWickets;
        resultNote = `${innings.battingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      } else if (nextWickets >= 10 || (isOverComplete && nextOvers >= innings.match.oversPerInnings)) {
        // Bowling team wins or Tie
        matchFinished = true;
        inningsFinished = true;
        if (nextRuns === target - 1) {
          resultNote = 'Match Tied!';
        } else {
          winnerTeamId = innings.bowlingTeamId;
          const runsMargin = (target - 1) - nextRuns;
          resultNote = `${innings.bowlingTeam.name} won by ${runsMargin} run${runsMargin === 1 ? '' : 's'}`;
        }
      }
    } else if (innings.inningsNumber === 1) {
      // Innings 1 completion check: when intended overs are bowled or all out
      if (nextWickets >= 10 || (isOverComplete && nextOvers >= innings.match.oversPerInnings)) {
        inningsFinished = true;
      }
    }

    // 8. Update Innings row
    await tx.innings.update({
      where: { id: inningsId },
      data: {
        runs: nextRuns,
        wickets: nextWickets,
        overs: nextOvers,
        balls: nextBalls,
        currentStrikerId: nextStrikerId,
        currentNonStrikerId: nextNonStrikerId,
        currentBowlerId: isOverComplete ? null : bowlerId, // Reset bowler at end of over
        status: inningsFinished ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    // 9. If Innings 1 finished, automatically initialize Innings 2 with swapped teams
    if (innings.inningsNumber === 1 && inningsFinished) {
      await tx.innings.upsert({
        where: { matchId_inningsNumber: { matchId: innings.matchId, inningsNumber: 2 } },
        create: {
          matchId: innings.matchId,
          inningsNumber: 2,
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
          status: 'NOT_STARTED',
        },
        update: {
          battingTeamId: innings.bowlingTeamId,
          bowlingTeamId: innings.battingTeamId,
        },
      });

      await tx.match.update({
        where: { id: innings.matchId },
        data: { currentInnings: 2 },
      });
    }

    // 10. Update Match if match finished
    if (matchFinished) {
      await tx.match.update({
        where: { id: innings.matchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          winnerTeamId,
          resultNote,
        },
      });
    }

    // 10. Record BallEvent with exact snapshot
    const ballEvent = await tx.ballEvent.create({
      data: {
        inningsId,
        overNumber: innings.overs,
        ballNumber: innings.balls + 1,
        batsmanId: strikerId,
        bowlerId,
        runs,
        extras: extraRuns > 0 ? extraRuns : extraType !== 'NONE' ? 1 : 0,
        extraType,
        isLegal,
        isWicket,
        wicketType: input.wicketType || null,
        dismissedPlayerId: isWicket ? dismissedPlayerId : null,
        commentary: input.commentary || null,
        strikerIdBefore: strikerId,
        nonStrikerIdBefore: nonStrikerId,
        bowlerIdBefore: bowlerId,
      },
    });

    return {
      matchId: innings.matchId,
      ballEventId: ballEvent.id,
      isOverComplete,
      inningsFinished,
      matchFinished,
      runs: totalBallRuns,
    };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'DELIVERY_RECORDED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Recorded delivery: ${result.runs} runs, Extra: ${input.extraType || 'NONE'}${input.isWicket ? ' [WICKET]' : ''}.`,
      performedBy: session.username,
      metadata: { inningsId, ballEventId: result.ballEventId, runs: result.runs, isWicket: input.isWicket },
    },
  }).catch(() => {});

  // Single authoritative match fetch for both response and realtime broadcast
  const updatedMatch = await getMatchDetail(result.matchId);

  // Broadcast realtime update concurrently with pre-loaded match object
  if (updatedMatch) {
    buildMatchBroadcastPayload(updatedMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, ...result, updatedMatch };
}

/**
 * 1-Click Deterministic Undo:
 * Rolls back the latest delivery recorded on the innings, restoring exact prior state.
 */
export async function undoLastDelivery(inningsId: string) {
  const session = await requireAdminAuth();

  const result = await prisma.$transaction(async (tx: any) => {
    const innings = await tx.innings.findUnique({
      where: { id: inningsId },
      include: { match: true },
    });

    if (!innings) throw new Error('Innings not found.');

    // Find the latest ball event
    const lastBall = await tx.ballEvent.findFirst({
      where: { inningsId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastBall) throw new Error('No deliveries to undo in this innings.');

    // 1. Calculate total runs to deduct
    let deliveryRuns = 0;
    if (lastBall.extraType === 'NONE') {
      deliveryRuns = lastBall.runs;
    } else if (lastBall.extraType === 'WIDE' || lastBall.extraType === 'NO_BALL') {
      deliveryRuns = (lastBall.extras || 1) + lastBall.runs;
    } else if (lastBall.extraType === 'BYE' || lastBall.extraType === 'LEG_BYE') {
      deliveryRuns = lastBall.extras || lastBall.runs || 1;
    }

    // 2. Rollback Batter statistics
    if (lastBall.extraType !== 'WIDE') {
      const runsOffBat = (lastBall.extraType === 'BYE' || lastBall.extraType === 'LEG_BYE') ? 0 : lastBall.runs;
      await tx.inningsBatter.updateMany({
        where: { inningsId, playerId: lastBall.batsmanId },
        data: {
          runs: { decrement: runsOffBat },
          balls: { decrement: 1 },
          fours: lastBall.runs === 4 && runsOffBat === 4 ? { decrement: 1 } : undefined,
          sixes: lastBall.runs === 6 && runsOffBat === 6 ? { decrement: 1 } : undefined,
          isOut: lastBall.isWicket && lastBall.dismissedPlayerId === lastBall.batsmanId ? false : undefined,
          dismissal: lastBall.isWicket && lastBall.dismissedPlayerId === lastBall.batsmanId ? null : undefined,
        },
      });
    }

    if (lastBall.isWicket && lastBall.dismissedPlayerId && lastBall.dismissedPlayerId !== lastBall.batsmanId) {
      await tx.inningsBatter.updateMany({
        where: { inningsId, playerId: lastBall.dismissedPlayerId },
        data: {
          isOut: false,
          dismissal: null,
        },
      });
    }

    // 3. Rollback Bowler statistics
    const bowlerRunsCharged = (lastBall.extraType === 'BYE' || lastBall.extraType === 'LEG_BYE') ? 0 : deliveryRuns;
    const bowlerWicketCredited = lastBall.isWicket && lastBall.wicketType !== 'RUN_OUT' && lastBall.wicketType !== 'TIMED_OUT' && lastBall.wicketType !== 'RETIRED_HURT';

    const currentBowlerRecord = await tx.inningsBowler.findUnique({
      where: { inningsId_playerId: { inningsId, playerId: lastBall.bowlerId } },
    });

    if (currentBowlerRecord) {
      let rolledOvers = currentBowlerRecord.overs;
      let rolledBalls = currentBowlerRecord.balls;

      if (lastBall.isLegal) {
        if (rolledBalls === 0 && rolledOvers > 0) {
          rolledOvers -= 1;
          rolledBalls = 5;
        } else if (rolledBalls > 0) {
          rolledBalls -= 1;
        }
      }

      await tx.inningsBowler.update({
        where: { inningsId_playerId: { inningsId, playerId: lastBall.bowlerId } },
        data: {
          overs: rolledOvers,
          balls: rolledBalls,
          runsConceded: { decrement: bowlerRunsCharged },
          wickets: bowlerWicketCredited ? { decrement: 1 } : undefined,
          wides: lastBall.extraType === 'WIDE' ? { decrement: lastBall.extras || 1 } : undefined,
          noBalls: lastBall.extraType === 'NO_BALL' ? { decrement: lastBall.extras || 1 } : undefined,
        },
      });
    }

    // 4. Rollback Innings overs & balls
    let restoredOvers = innings.overs;
    let restoredBalls = innings.balls;

    if (lastBall.isLegal) {
      if (restoredBalls === 0 && restoredOvers > 0) {
        restoredOvers -= 1;
        restoredBalls = 5;
      } else if (restoredBalls > 0) {
        restoredBalls -= 1;
      }
    }

    // 5. Update Innings row and restore snapshot
    await tx.innings.update({
      where: { id: inningsId },
      data: {
        runs: Math.max(0, innings.runs - deliveryRuns),
        wickets: lastBall.isWicket ? Math.max(0, innings.wickets - 1) : innings.wickets,
        overs: restoredOvers,
        balls: restoredBalls,
        currentStrikerId: lastBall.strikerIdBefore || innings.currentStrikerId,
        currentNonStrikerId: lastBall.nonStrikerIdBefore || innings.currentNonStrikerId,
        currentBowlerId: lastBall.bowlerIdBefore || lastBall.bowlerId,
        status: 'IN_PROGRESS',
      },
    });

    // Reopen match if it was completed
    if (innings.match.status === 'COMPLETED') {
      await tx.match.update({
        where: { id: innings.matchId },
        data: {
          status: 'LIVE',
          completedAt: null,
          winnerTeamId: null,
          resultNote: null,
        },
      });
    }

    // 6. Delete the BallEvent
    await tx.ballEvent.delete({
      where: { id: lastBall.id },
    });

    return {
      matchId: innings.matchId,
      undoneBallId: lastBall.id,
    };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'BALL_UNDONE',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Undid latest delivery (${result.undoneBallId}) on innings ${inningsId}.`,
      performedBy: session.username,
      metadata: { inningsId, undoneBallId: result.undoneBallId },
    },
  }).catch(() => {});

  const updatedMatch = await getMatchDetail(result.matchId);

  if (updatedMatch) {
    buildMatchBroadcastPayload(updatedMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, updatedMatch };
}

/**
 * Changes the active bowler on an innings.
 */
export async function changeBowler(inningsId: string, bowlerId: string) {
  const session = await requireAdminAuth();

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
  });

  if (!innings) return { success: false, error: 'Innings not found.' };

  await prisma.$transaction(async (tx: any) => {
    // Unmark old current bowler
    await tx.inningsBowler.updateMany({
      where: { inningsId },
      data: { isCurrent: false },
    });

    // Mark new current bowler
    await tx.inningsBowler.upsert({
      where: { inningsId_playerId: { inningsId, playerId: bowlerId } },
      create: {
        inningsId,
        playerId: bowlerId,
        isCurrent: true,
      },
      update: {
        isCurrent: true,
      },
    });

    await tx.innings.update({
      where: { id: inningsId },
      data: { currentBowlerId: bowlerId },
    });
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'BOWLER_CHANGED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Bowler changed to ${bowlerId}.`,
      performedBy: session.username,
      metadata: { inningsId, bowlerId },
    },
  }).catch(() => {});

  buildMatchBroadcastPayload(innings.matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(innings.matchId) };
}

/**
 * Manually swaps the striker and non-striker.
 */
export async function swapStriker(inningsId: string) {
  const session = await requireAdminAuth();

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
  });

  if (!innings || !innings.currentStrikerId || !innings.currentNonStrikerId) {
    return { success: false, error: 'Innings or batters not configured.' };
  }

  const newStrikerId = innings.currentNonStrikerId;
  const newNonStrikerId = innings.currentStrikerId;

  await prisma.$transaction(async (tx: any) => {
    await tx.innings.update({
      where: { id: inningsId },
      data: {
        currentStrikerId: newStrikerId,
        currentNonStrikerId: newNonStrikerId,
      },
    });

    await tx.inningsBatter.updateMany({
      where: { inningsId, playerId: newStrikerId },
      data: { isStriker: true },
    });

    await tx.inningsBatter.updateMany({
      where: { inningsId, playerId: newNonStrikerId },
      data: { isStriker: false },
    });
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'STRIKER_SWAPPED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Strike swapped manually: Striker is now ${newStrikerId}.`,
      performedBy: session.username,
      metadata: { inningsId, strikerId: newStrikerId, nonStrikerId: newNonStrikerId },
    },
  }).catch(() => {});

  buildMatchBroadcastPayload(innings.matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(innings.matchId) };
}

/**
 * Replaces a batter (e.g. after a wicket or injury).
 */
export async function switchBatter(inningsId: string, role: 'striker' | 'nonStriker', newPlayerId: string) {
  const session = await requireAdminAuth();

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
  });

  if (!innings) return { success: false, error: 'Innings not found.' };

  await prisma.$transaction(async (tx: any) => {
    const batterCount = await tx.inningsBatter.count({ where: { inningsId } });

    await tx.inningsBatter.upsert({
      where: { inningsId_playerId: { inningsId, playerId: newPlayerId } },
      create: {
        inningsId,
        playerId: newPlayerId,
        battingOrder: batterCount + 1,
        isStriker: role === 'striker',
      },
      update: {
        isStriker: role === 'striker',
      },
    });

    if (role === 'striker') {
      await tx.innings.update({
        where: { id: inningsId },
        data: { currentStrikerId: newPlayerId },
      });
    } else {
      await tx.innings.update({
        where: { id: inningsId },
        data: { currentNonStrikerId: newPlayerId },
      });
    }
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'BATTER_CHANGED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Changed ${role} to player ${newPlayerId}.`,
      performedBy: session.username,
      metadata: { inningsId, role, newPlayerId },
    },
  }).catch(() => {});

  buildMatchBroadcastPayload(innings.matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(innings.matchId) };
}

/**
 * Ends current innings. If Innings 1, initializes Innings 2.
 */
export async function endInnings(inningsId: string) {
  const session = await requireAdminAuth();

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
    include: { match: true },
  });

  if (!innings) return { success: false, error: 'Innings not found.' };

  await (prisma as any).innings.update({
    where: { id: inningsId },
    data: { status: 'COMPLETED' },
  });

  if (innings.inningsNumber === 1) {
    // Create Innings 2 with swapped teams
    await (prisma as any).innings.upsert({
      where: { matchId_inningsNumber: { matchId: innings.matchId, inningsNumber: 2 } },
      create: {
        matchId: innings.matchId,
        inningsNumber: 2,
        battingTeamId: innings.bowlingTeamId,
        bowlingTeamId: innings.battingTeamId,
        status: 'NOT_STARTED',
      },
      update: {
        battingTeamId: innings.bowlingTeamId,
        bowlingTeamId: innings.battingTeamId,
      },
    });

    await (prisma as any).match.update({
      where: { id: innings.matchId },
      data: { currentInnings: 2 },
    });
  }

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'INNINGS_ENDED',
      entityType: 'Innings',
      entityId: inningsId,
      description: `Innings ${innings.inningsNumber} ended with ${innings.runs}/${innings.wickets} in ${innings.overs}.${innings.balls} overs.`,
      performedBy: session.username,
      metadata: { inningsId, inningsNumber: innings.inningsNumber, score: `${innings.runs}/${innings.wickets}` },
    },
  }).catch(() => {});

  buildMatchBroadcastPayload(innings.matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(innings.matchId) };
}

/**
 * Completes match and records winning team and result note.
 */
export async function completeMatch(matchId: string, input: { winnerTeamId?: string; resultNote?: string }) {
  const session = await requireAdminAuth();

  const match = await (prisma as any).match.findUnique({
    where: { id: matchId },
  });

  if (!match) return { success: false, error: 'Match not found.' };

  await (prisma as any).match.update({
    where: { id: matchId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      winnerTeamId: input.winnerTeamId || null,
      resultNote: input.resultNote?.trim() || null,
    },
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'MATCH_COMPLETED',
      entityType: 'Match',
      entityId: matchId,
      description: `Match completed. Result: ${input.resultNote || 'Completed'}.`,
      performedBy: session.username,
      metadata: { matchId, ...input },
    },
  }).catch(() => {});

  buildMatchBroadcastPayload(matchId)
    .then((p) => { if (p) broadcastScoreUpdate(p); })
    .catch(() => {});

  return { success: true, updatedMatch: await getMatchDetail(matchId) };
}
