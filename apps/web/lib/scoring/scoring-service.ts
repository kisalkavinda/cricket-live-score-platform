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
  ballsPerOver?: number;
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
 * Returns full authoritative match detail including all innings, batting scores,
 * bowling scores, and ball-by-ball events for live scoring console & public scorecard.
 */
export async function getMatchDetail(matchId: string) {
  const match = await (prisma as any).match.findUnique({
    where: { id: matchId },
    include: {
      tournament: {
        include: { stages: true },
      },
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
          },
          ballEvents: {
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

  if (match) {
    // If ballsPerOver was not explicitly set on match, inherit from tournament stage
    if (!match.ballsPerOver && match.tournament?.stages?.[0]?.ballsPerOver) {
      match.ballsPerOver = match.tournament.stages[0].ballsPerOver;
    }
  }

  return match;
}

/**
 * Updates match rules (overs per innings or balls per over) dynamically on live match.
 */
export async function updateMatchRules(matchId: string, input: { oversPerInnings?: number; ballsPerOver?: number }) {
  await requireAdminAuth();
  await (prisma as any).match.update({
    where: { id: matchId },
    data: {
      oversPerInnings: input.oversPerInnings ? Number(input.oversPerInnings) : undefined,
      ballsPerOver: input.ballsPerOver ? Number(input.ballsPerOver) : undefined,
    },
  });

  const fullMatch = await getMatchDetail(matchId);
  if (fullMatch) {
    buildMatchBroadcastPayload(fullMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, updatedMatch: fullMatch };
}

/**
 * Returns full public scorecard data with zero-cache requirement.
 */
export async function getPublicMatchScorecard(matchId: string) {
  return await getMatchDetail(matchId);
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

  const matchBallsPerOver = match.ballsPerOver || 6;
  const currentInnings = match.innings.find((i: any) => i.inningsNumber === match.currentInnings) || match.innings[0] || null;

  let striker = null;
  let nonStriker = null;
  let bowler = null;
  let crr = '0.00';
  let rrr = undefined;
  let target = undefined;

  let chase: any = null;

  if (currentInnings) {
    const totalOversDecimal = currentInnings.overs + currentInnings.balls / matchBallsPerOver;
    if (totalOversDecimal > 0) {
      crr = (currentInnings.runs / totalOversDecimal).toFixed(2);
    }

    if (currentInnings.inningsNumber === 2 || currentInnings.inningsNumber === 4) {
      const firstInnNum = currentInnings.inningsNumber === 2 ? 1 : 3;
      const inn1 = match.innings?.find((i: any) => i.inningsNumber === firstInnNum);
      if (inn1) {
        target = inn1.runs + 1;
        const runsNeeded = Math.max(0, target - currentInnings.runs);
        const totalOvers = currentInnings.inningsNumber === 4 ? 1 : match.oversPerInnings;
        const totalBallsPossible = totalOvers * matchBallsPerOver;
        const ballsBowled = currentInnings.overs * matchBallsPerOver + currentInnings.balls;
        const ballsRemaining = Math.max(0, totalBallsPossible - ballsBowled);
        if (ballsRemaining > 0 && runsNeeded > 0) {
          rrr = ((runsNeeded / ballsRemaining) * matchBallsPerOver).toFixed(2);
        } else {
          rrr = '0.00';
        }

        chase = {
          isChase: true,
          battingTeamName: currentInnings.battingTeam?.name || 'Batting Team',
          target,
          runsNeeded,
          ballsRemaining,
          rrr: rrr || '0.00',
          crr,
        };
      }
    }

    const strikerScore = currentInnings.battingScores.find(
      (b: any) => b.playerId === currentInnings.currentStrikerId
    );
    if (strikerScore) {
      const balls = strikerScore.balls || 0;
      const runs = strikerScore.runs || 0;
      striker = {
        id: strikerScore.player?.id || currentInnings.currentStrikerId || 'striker',
        name: strikerScore.player?.name || 'Striker',
        runs,
        balls,
        fours: strikerScore.fours || 0,
        sixes: strikerScore.sixes || 0,
        sr: balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0',
      };
    }

    const nonStrikerScore = currentInnings.battingScores.find(
      (b: any) => b.playerId === currentInnings.currentNonStrikerId
    );
    if (nonStrikerScore) {
      const balls = nonStrikerScore.balls || 0;
      const runs = nonStrikerScore.runs || 0;
      nonStriker = {
        id: nonStrikerScore.player?.id || currentInnings.currentNonStrikerId || 'nonStriker',
        name: nonStrikerScore.player?.name || 'Non-Striker',
        runs,
        balls,
        fours: nonStrikerScore.fours || 0,
        sixes: nonStrikerScore.sixes || 0,
        sr: balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0',
      };
    }

    const bowlerScore = currentInnings.bowlingScores.find(
      (b: any) => b.playerId === currentInnings.currentBowlerId
    );
    if (bowlerScore) {
      const bowlerTotalOvers = bowlerScore.overs + bowlerScore.balls / matchBallsPerOver;
      const econ = bowlerTotalOvers > 0 ? (bowlerScore.runsConceded / bowlerTotalOvers).toFixed(2) : '0.00';
      bowler = {
        id: bowlerScore.player?.id || currentInnings.currentBowlerId || 'bowler',
        name: bowlerScore.player?.name || 'Bowler',
        overs: `${bowlerScore.overs}.${bowlerScore.balls}`,
        maidens: bowlerScore.maidens || 0,
        runsConceded: bowlerScore.runsConceded || 0,
        wickets: bowlerScore.wickets || 0,
        econ,
        economy: econ,
        wides: bowlerScore.wides || 0,
        noBalls: bowlerScore.noBalls || 0,
      };
    }
  }

  const recentBalls = (currentInnings?.ballEvents || []).slice(0, matchBallsPerOver).map((b: any) => ({
    id: b.id || '',
    overNumber: b.overNumber ?? 0,
    ballNumber: b.ballNumber ?? 0,
    runs: b.runs ?? 0,
    extras: b.extras ?? 0,
    extraType: b.extraType || 'NONE',
    isLegal: b.isLegal ?? true,
    isWicket: b.isWicket ?? false,
    wicketType: b.wicketType || null,
    display: b.isWicket ? 'W' : (b.extraType === 'WIDE' ? 'WD' : (b.extraType === 'NO_BALL' ? 'NB' : `${b.runs ?? 0}`)),
  }));

  return {
    matchId: match.id,
    status: match.status,
    currentInnings: match.currentInnings,
    match: {
      id: match.id,
      teamA: {
        id: match.teamA.id,
        name: match.teamA.name,
        shortName: match.teamA.shortName,
        logoUrl: match.teamA.logoUrl,
      },
      teamB: {
        id: match.teamB.id,
        name: match.teamB.name,
        shortName: match.teamB.shortName,
        logoUrl: match.teamB.logoUrl,
      },
      venue: match.venue || 'Ratmalana Ground',
      oversPerInnings: match.oversPerInnings,
      ballsPerOver: matchBallsPerOver,
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
    allInningsSummary: (match.innings || []).map((inn: any) => ({
      inningsNumber: inn.inningsNumber,
      battingTeamId: inn.battingTeamId,
      runs: inn.runs ?? 0,
      wickets: inn.wickets ?? 0,
      overs: inn.overs ?? 0,
      balls: inn.balls ?? 0,
      isSuperOver: inn.inningsNumber >= 3,
    })),
    striker,
    nonStriker,
    bowler,
    recentBalls,
    chase,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MUTATION FUNCTIONS (Authoritative PostgreSQL writes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a match between two teams in UPCOMING state.
 */
export async function createMatch(input: CreateMatchInput) {
  const session = await requireAdminAuth();

  if (!input.tournamentId || !input.teamAId || !input.teamBId) {
    return { success: false, error: 'Tournament and both teams are required.' };
  }

  if (input.teamAId === input.teamBId) {
    return { success: false, error: 'Team A and Team B cannot be the same team.' };
  }

  const [teamA, teamB, tournament] = await Promise.all([
    (prisma as any).team.findUnique({ where: { id: input.teamAId } }),
    (prisma as any).team.findUnique({ where: { id: input.teamBId } }),
    (prisma as any).tournament.findUnique({ where: { id: input.tournamentId } }),
  ]);

  if (!teamA || !teamB) {
    return { success: false, error: 'One or both teams not found.' };
  }

  if (!tournament) {
    return { success: false, error: 'Tournament not found.' };
  }

  const match = await (prisma as any).match.create({
    data: {
      tournamentId: input.tournamentId,
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      venue: input.venue?.trim() || 'Main Ground',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      oversPerInnings: input.oversPerInnings || 20,
      ballsPerOver: input.ballsPerOver ? Number(input.ballsPerOver) : 6,
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
    // 1. Update Innings active players & ensure status is IN_PROGRESS
    await tx.innings.update({
      where: { id: inningsId },
      data: {
        status: 'IN_PROGRESS',
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
            teamA: true,
            teamB: true,
          },
        },
        battingTeam: true,
        bowlingTeam: true,
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
    const matchBallsPerOver = innings.match?.ballsPerOver || 6;
    let nextOvers = innings.overs;
    let nextBalls = innings.balls;
    let isOverComplete = false;

    if (isLegal) {
      if (nextBalls + 1 >= matchBallsPerOver) {
        nextOvers += 1;
        nextBalls = 0;
        isOverComplete = true;
      } else {
        nextBalls += 1;
      }
    }

    const nextRuns = innings.runs + totalBallRuns;
    const teamWicketLost = isWicket && input.wicketType !== 'RETIRED_HURT';
    const nextWickets = innings.wickets + (teamWicketLost ? 1 : 0);

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

      const isRetHurt = input.wicketType === 'RETIRED_HURT';

      // Guarantee dismissed player record exists with correct isOut status
      await tx.inningsBatter.upsert({
        where: { inningsId_playerId: { inningsId, playerId: dismissedPlayerId } },
        create: {
          inningsId,
          playerId: dismissedPlayerId,
          runs: 0,
          balls: (extraType !== 'WIDE' && dismissedPlayerId === strikerId) ? 1 : 0,
          fours: 0,
          sixes: 0,
          isOut: !isRetHurt,
          dismissal: dismissalText,
          isStriker: false,
        },
        update: {
          isOut: !isRetHurt,
          dismissal: dismissalText,
          isStriker: false,
        },
      });

      // Determine next incoming batter (optional)
      const incomingBatterId = input.newBatterId || null;

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
      } else {
        if (dismissedPlayerId === strikerId) {
          nextStrikerId = null;
        } else {
          nextNonStrikerId = null;
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

    const battingTeamName = innings.battingTeam?.name || (innings.battingTeamId === innings.match.teamAId ? innings.match.teamA?.name : innings.match.teamB?.name) || 'Batting Team';
    const bowlingTeamName = innings.bowlingTeam?.name || (innings.bowlingTeamId === innings.match.teamAId ? innings.match.teamA?.name : innings.match.teamB?.name) || 'Bowling Team';

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
        resultNote = `${battingTeamName} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      } else if (nextWickets >= 10 || (isOverComplete && nextOvers >= innings.match.oversPerInnings)) {
        // Bowling team wins or Tie
        matchFinished = true;
        inningsFinished = true;
        if (nextRuns === target - 1) {
          resultNote = 'Match Tied! (Super Over available)';
        } else {
          winnerTeamId = innings.bowlingTeamId;
          const runsMargin = (target - 1) - nextRuns;
          resultNote = `${bowlingTeamName} won by ${runsMargin} run${runsMargin === 1 ? '' : 's'}`;
        }
      }
    } else if (innings.inningsNumber === 4) {
      // Super Over 2 chase logic (1 over limit, 2 wickets max)
      const inn3 = innings.match.innings.find((i: any) => i.inningsNumber === 3);
      const target = (inn3?.runs || 0) + 1;
      if (nextRuns >= target) {
        matchFinished = true;
        inningsFinished = true;
        winnerTeamId = innings.battingTeamId;
        resultNote = `${battingTeamName} won the Super Over!`;
      } else if (nextWickets >= 2 || (isOverComplete && nextOvers >= 1)) {
        matchFinished = true;
        inningsFinished = true;
        if (nextRuns === target - 1) {
          resultNote = 'Super Over Tied!';
        } else {
          winnerTeamId = innings.bowlingTeamId;
          const runsMargin = (target - 1) - nextRuns;
          resultNote = `${bowlingTeamName} won the Super Over by ${runsMargin} run${runsMargin === 1 ? '' : 's'}!`;
        }
      }
    } else if (innings.inningsNumber === 3) {
      // Super Over 1 logic (1 over limit, 2 wickets max)
      if (nextWickets >= 2 || (isOverComplete && nextOvers >= 1)) {
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
        status: (inningsFinished && (innings.inningsNumber === 2 || innings.inningsNumber === 3 || innings.inningsNumber === 4)) ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    // 9. Update Match if match finished (Innings 2 chase complete)
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

    const matchBallsPerOver = innings.match?.ballsPerOver || 6;
    const currentBowlerRecord = await tx.inningsBowler.findUnique({
      where: { inningsId_playerId: { inningsId, playerId: lastBall.bowlerId } },
    });

    if (currentBowlerRecord) {
      let rolledOvers = currentBowlerRecord.overs;
      let rolledBalls = currentBowlerRecord.balls;

      if (lastBall.isLegal) {
        if (rolledBalls === 0 && rolledOvers > 0) {
          rolledOvers -= 1;
          rolledBalls = matchBallsPerOver - 1;
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
        restoredBalls = matchBallsPerOver - 1;
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
 * Replaces a batter (e.g. after a wicket, injury, or correction).
 * If the selected player is already active at the other role, it automatically swaps roles.
 */
export async function switchBatter(inningsId: string, role: 'striker' | 'nonStriker', newPlayerId: string) {
  const session = await requireAdminAuth();

  const innings = await (prisma as any).innings.findUnique({
    where: { id: inningsId },
  });

  if (!innings) return { success: false, error: 'Innings not found.' };

  await prisma.$transaction(async (tx: any) => {
    const batterCount = await tx.inningsBatter.count({ where: { inningsId } });

    // Determine if newPlayerId is already active at the opposite role
    const isCurrentlyOtherRole = role === 'striker' 
      ? innings.currentNonStrikerId === newPlayerId 
      : innings.currentStrikerId === newPlayerId;

    let nextStrikerId = innings.currentStrikerId;
    let nextNonStrikerId = innings.currentNonStrikerId;

    if (role === 'striker') {
      if (isCurrentlyOtherRole) {
        // Swap: previous striker moves to non-striker
        nextNonStrikerId = (innings.currentStrikerId && innings.currentStrikerId !== newPlayerId) 
          ? innings.currentStrikerId 
          : null;
      }
      nextStrikerId = newPlayerId;
    } else {
      if (isCurrentlyOtherRole) {
        // Swap: previous non-striker moves to striker
        nextStrikerId = (innings.currentNonStrikerId && innings.currentNonStrikerId !== newPlayerId) 
          ? innings.currentNonStrikerId 
          : null;
      }
      nextNonStrikerId = newPlayerId;
    }

    // Upsert the chosen player
    await tx.inningsBatter.upsert({
      where: { inningsId_playerId: { inningsId, playerId: newPlayerId } },
      create: {
        inningsId,
        playerId: newPlayerId,
        battingOrder: batterCount + 1,
        isStriker: role === 'striker',
        isOut: false,
        dismissal: null,
      },
      update: {
        isStriker: role === 'striker',
        isOut: false,
        dismissal: null,
      },
    });

    if (nextStrikerId) {
      await tx.inningsBatter.updateMany({
        where: { inningsId, playerId: nextStrikerId },
        data: { isStriker: true, isOut: false, dismissal: null },
      });
    }

    if (nextNonStrikerId && nextNonStrikerId !== nextStrikerId) {
      await tx.inningsBatter.updateMany({
        where: { inningsId, playerId: nextNonStrikerId },
        data: { isStriker: false, isOut: false, dismissal: null },
      });
    }

    await tx.innings.update({
      where: { id: inningsId },
      data: {
        currentStrikerId: nextStrikerId,
        currentNonStrikerId: nextNonStrikerId,
      },
    });
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

  if (innings.inningsNumber === 1 || innings.inningsNumber === 3) {
    const nextInn = innings.inningsNumber + 1;
    // Create Next Innings with swapped teams
    await (prisma as any).innings.upsert({
      where: { matchId_inningsNumber: { matchId: innings.matchId, inningsNumber: nextInn } },
      create: {
        matchId: innings.matchId,
        inningsNumber: nextInn,
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
      data: { currentInnings: nextInn },
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
 * Initiates a Super Over (Tie-Breaker Innings).
 */
export async function startSuperOver(matchId: string, input: { battingFirstTeamId: string; ballsPerOver?: number }) {
  const session = await requireAdminAuth();

  const match = await (prisma as any).match.findUnique({
    where: { id: matchId },
    include: { innings: { orderBy: { inningsNumber: 'asc' } }, teamA: true, teamB: true },
  });

  if (!match) return { success: false, error: 'Match not found.' };

  const battingTeamId = input.battingFirstTeamId;
  const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;

  // Next Super Over innings number (3 for 1st Super Over, 5 for 2nd)
  const highestInnNum = match.innings.reduce((max: number, i: any) => Math.max(max, i.inningsNumber), 0);
  const nextInnNumber = Math.max(3, highestInnNum + 1);

  const superOverInn = await (prisma as any).innings.upsert({
    where: { matchId_inningsNumber: { matchId, inningsNumber: nextInnNumber } },
    create: {
      matchId,
      inningsNumber: nextInnNumber,
      battingTeamId,
      bowlingTeamId,
      status: 'NOT_STARTED',
    },
    update: {
      battingTeamId,
      bowlingTeamId,
      status: 'NOT_STARTED',
    },
  });

  const matchUpdateData: any = {
    status: 'LIVE',
    currentInnings: nextInnNumber,
    resultNote: 'Super Over In Progress',
    winnerTeamId: null,
  };
  if (input.ballsPerOver && input.ballsPerOver >= 1 && input.ballsPerOver <= 12) {
    matchUpdateData.ballsPerOver = input.ballsPerOver;
  }

  await (prisma as any).match.update({
    where: { id: matchId },
    data: matchUpdateData,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'SUPER_OVER_STARTED',
      entityType: 'Match',
      entityId: matchId,
      description: `Super Over started (Innings ${nextInnNumber}). Batting: ${battingTeamId === match.teamAId ? match.teamA.name : match.teamB.name}.${input.ballsPerOver ? ` (${input.ballsPerOver} balls/over)` : ''}`,
      performedBy: session.username,
      metadata: { matchId, inningsNumber: nextInnNumber, battingTeamId, bowlingTeamId, ballsPerOver: input.ballsPerOver },
    },
  }).catch(() => {});

  const updatedMatch = await getMatchDetail(matchId);
  if (updatedMatch) {
    buildMatchBroadcastPayload(updatedMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, inningsId: superOverInn.id, updatedMatch };
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

/**
 * Fully recalculates all innings statistics from raw ball events.
 */
export async function recalculateInningsFromBalls(tx: any, inningsId: string) {
  const innings = await tx.innings.findUnique({
    where: { id: inningsId },
    include: {
      match: true,
      battingScores: true,
      bowlingScores: true,
    },
  });
  if (!innings) return;

  const matchBallsPerOver = innings.match?.ballsPerOver || 6;
  const allBalls = await tx.ballEvent.findMany({
    where: { inningsId },
    orderBy: { createdAt: 'asc' },
  });

  // 1. Reset all batter records
  await tx.inningsBatter.updateMany({
    where: { inningsId },
    data: { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null },
  });

  // 2. Reset all bowler records
  await tx.inningsBowler.updateMany({
    where: { inningsId },
    data: { overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 },
  });

  let totalRuns = 0;
  let totalWickets = 0;
  let legalBallsCount = 0;

  const batterMap: Record<string, { runs: number; balls: number; fours: number; sixes: number; isOut: boolean; dismissal: string | null }> = {};
  const bowlerMap: Record<string, { balls: number; runsConceded: number; wickets: number; wides: number; noBalls: number }> = {};

  for (const b of allBalls) {
    const currentBallOver = Math.floor(legalBallsCount / matchBallsPerOver);
    const currentBallNum = (legalBallsCount % matchBallsPerOver) + 1;

    if (b.overNumber !== currentBallOver || b.ballNumber !== currentBallNum) {
      await tx.ballEvent.update({
        where: { id: b.id },
        data: { overNumber: currentBallOver, ballNumber: currentBallNum },
      });
    }

    let deliveryRuns = 0;
    if (b.extraType === 'NONE') {
      deliveryRuns = b.runs || 0;
    } else if (b.extraType === 'WIDE' || b.extraType === 'NO_BALL') {
      deliveryRuns = (b.extras || 1) + (b.runs || 0);
    } else if (b.extraType === 'BYE' || b.extraType === 'LEG_BYE') {
      deliveryRuns = b.extras || b.runs || 1;
    }
    totalRuns += deliveryRuns;

    if (b.isWicket && b.wicketType !== 'RETIRED_HURT') {
      totalWickets += 1;
    }

    if (b.isLegal) {
      legalBallsCount += 1;
    }

    // Batter stats
    if (b.batsmanId) {
      if (!batterMap[b.batsmanId]) {
        batterMap[b.batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null };
      }
      if (b.extraType !== 'WIDE') {
        const offBat = (b.extraType === 'BYE' || b.extraType === 'LEG_BYE') ? 0 : (b.runs || 0);
        batterMap[b.batsmanId].runs += offBat;
        batterMap[b.batsmanId].balls += 1;
        if (b.runs === 4 && offBat === 4) batterMap[b.batsmanId].fours += 1;
        if (b.runs === 6 && offBat === 6) batterMap[b.batsmanId].sixes += 1;
      }
    }

    if (b.isWicket && b.dismissedPlayerId) {
      if (!batterMap[b.dismissedPlayerId]) {
        batterMap[b.dismissedPlayerId] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null };
      }
      const isRetHurt = b.wicketType === 'RETIRED_HURT';
      batterMap[b.dismissedPlayerId].isOut = !isRetHurt;
      batterMap[b.dismissedPlayerId].dismissal = isRetHurt ? 'retired hurt' : (b.wicketType ? `WICKET (${b.wicketType})` : 'OUT');
    }

    // Bowler stats
    if (b.bowlerId) {
      if (!bowlerMap[b.bowlerId]) {
        bowlerMap[b.bowlerId] = { balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
      }
      if (b.isLegal) {
        bowlerMap[b.bowlerId].balls += 1;
      }
      const bowlerRunsCharged = (b.extraType === 'BYE' || b.extraType === 'LEG_BYE') ? 0 : deliveryRuns;
      bowlerMap[b.bowlerId].runsConceded += bowlerRunsCharged;
      if (b.extraType === 'WIDE') bowlerMap[b.bowlerId].wides += (b.extras || 1);
      if (b.extraType === 'NO_BALL') bowlerMap[b.bowlerId].noBalls += (b.extras || 1);
      if (b.isWicket && b.wicketType !== 'RUN_OUT' && b.wicketType !== 'TIMED_OUT' && b.wicketType !== 'RETIRED_HURT') {
        bowlerMap[b.bowlerId].wickets += 1;
      }
    }
  }

  for (const [playerId, s] of Object.entries(batterMap)) {
    await tx.inningsBatter.updateMany({
      where: { inningsId, playerId },
      data: s,
    });
  }

  for (const [playerId, s] of Object.entries(bowlerMap)) {
    const bowlerOvers = Math.floor(s.balls / matchBallsPerOver);
    const bowlerBalls = s.balls % matchBallsPerOver;
    await tx.inningsBowler.updateMany({
      where: { inningsId, playerId },
      data: {
        overs: bowlerOvers,
        balls: bowlerBalls,
        runsConceded: s.runsConceded,
        wickets: s.wickets,
        wides: s.wides,
        noBalls: s.noBalls,
      },
    });
  }

  const finalOvers = Math.floor(legalBallsCount / matchBallsPerOver);
  const finalBalls = legalBallsCount % matchBallsPerOver;

  // 3. Re-determine active striker, non-striker, and bowler from the resulting ball sequence
  let activeStrikerId = innings.currentStrikerId;
  let activeNonStrikerId = innings.currentNonStrikerId;
  let activeBowlerId = innings.currentBowlerId;

  if (allBalls.length > 0) {
    const lastBall = allBalls[allBalls.length - 1];
    const isLastOverComplete = (legalBallsCount % matchBallsPerOver === 0) && (legalBallsCount > 0) && lastBall.isLegal;
    
    let s = lastBall.strikerIdBefore || lastBall.batsmanId;
    let ns = lastBall.nonStrikerIdBefore || innings.currentNonStrikerId;

    if (lastBall.isWicket && lastBall.wicketType !== 'RETIRED_HURT') {
      if (lastBall.dismissedPlayerId === s) s = null;
      else if (lastBall.dismissedPlayerId === ns) ns = null;
    }

    if (s && ns && (lastBall.runs % 2 !== 0)) {
      const temp = s;
      s = ns;
      ns = temp;
    }

    if (s && ns && isLastOverComplete) {
      const temp = s;
      s = ns;
      ns = temp;
    }

    activeStrikerId = s;
    activeNonStrikerId = ns;
    activeBowlerId = isLastOverComplete ? null : lastBall.bowlerId;
  }

  await tx.innings.update({
    where: { id: inningsId },
    data: {
      runs: totalRuns,
      wickets: totalWickets,
      overs: finalOvers,
      balls: finalBalls,
      currentStrikerId: activeStrikerId,
      currentNonStrikerId: activeNonStrikerId,
      currentBowlerId: activeBowlerId,
    },
  });

  if (activeStrikerId) {
    await tx.inningsBatter.updateMany({
      where: { inningsId, playerId: activeStrikerId },
      data: { isStriker: true },
    });
  }
  if (activeNonStrikerId && activeNonStrikerId !== activeStrikerId) {
    await tx.inningsBatter.updateMany({
      where: { inningsId, playerId: activeNonStrikerId },
      data: { isStriker: false },
    });
  }
}

/**
 * Edits an individual delivery event and recomputes all innings statistics with mathematical integrity.
 */
export async function editBallDelivery(
  ballId: string,
  input: {
    runs?: number;
    extraType?: ExtraTypeValue;
    extras?: number;
    isWicket?: boolean;
    wicketType?: string;
  }
) {
  const session = await requireAdminAuth();

  const ball = await (prisma as any).ballEvent.findUnique({
    where: { id: ballId },
    include: { innings: true },
  });

  if (!ball) return { success: false, error: 'Ball delivery event not found.' };

  const runs = input.runs !== undefined ? Number(input.runs) : ball.runs;
  const extraType: ExtraTypeValue = input.extraType !== undefined ? input.extraType : ball.extraType;
  const extras = input.extras !== undefined ? Number(input.extras) : ball.extras;
  const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL';
  const isWicket = input.isWicket !== undefined ? Boolean(input.isWicket) : ball.isWicket;

  // Check if a previous wicket is being revoked/cancelled into normal score
  const wasWicketCancelled = ball.isWicket && !isWicket;

  await prisma.$transaction(async (tx: any) => {
    // If a false wicket is cancelled/edited to scoring, delete any subsequent balls bowled after it
    if (wasWicketCancelled) {
      await tx.ballEvent.deleteMany({
        where: {
          inningsId: ball.inningsId,
          createdAt: { gt: ball.createdAt },
        },
      });
    }

    await tx.ballEvent.update({
      where: { id: ballId },
      data: {
        runs,
        extraType,
        extras,
        isLegal,
        isWicket,
        wicketType: isWicket ? (input.wicketType || ball.wicketType || 'BOWLED') : null,
        dismissedPlayerId: isWicket ? (ball.dismissedPlayerId || ball.batsmanId) : null,
      },
    });

    await recalculateInningsFromBalls(tx, ball.inningsId);

    // If match was previously marked COMPLETED due to an incorrect wicket, reopen it to LIVE
    if (ball.innings.matchId) {
      const inn = await tx.innings.findUnique({
        where: { id: ball.inningsId },
        include: { match: true },
      });
      if (inn && inn.match.status === 'COMPLETED' && inn.status !== 'COMPLETED') {
        await tx.match.update({
          where: { id: inn.matchId },
          data: {
            status: 'LIVE',
            completedAt: null,
            winnerTeamId: null,
            resultNote: null,
          },
        });
      }
    }
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'BALL_EDITED',
      entityType: 'BallEvent',
      entityId: ballId,
      description: `Edited delivery: ${runs}r, extraType=${extraType}, extras=${extras}, isWicket=${isWicket}.`,
      performedBy: session.username,
      metadata: { ballId, inningsId: ball.inningsId, ...input },
    },
  }).catch(() => {});

  const updatedMatch = await getMatchDetail(ball.innings.matchId);
  if (updatedMatch) {
    buildMatchBroadcastPayload(updatedMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, updatedMatch };
}

/**
 * Deletes an individual delivery event and recomputes all innings statistics.
 */
export async function deleteBallDelivery(ballId: string) {
  const session = await requireAdminAuth();

  const ball = await (prisma as any).ballEvent.findUnique({
    where: { id: ballId },
    include: { innings: true },
  });

  if (!ball) return { success: false, error: 'Ball delivery event not found.' };

  await prisma.$transaction(async (tx: any) => {
    // Delete this ball and any subsequent deliveries in this innings
    await tx.ballEvent.deleteMany({
      where: {
        inningsId: ball.inningsId,
        createdAt: { gte: ball.createdAt },
      },
    });

    await recalculateInningsFromBalls(tx, ball.inningsId);
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  (prisma as any).adminAuditLog.create({
    data: {
      action: 'BALL_DELETED',
      entityType: 'BallEvent',
      entityId: ballId,
      description: `Deleted delivery ${ballId} on innings ${ball.inningsId}.`,
      performedBy: session.username,
      metadata: { ballId, inningsId: ball.inningsId },
    },
  }).catch(() => {});

  const updatedMatch = await getMatchDetail(ball.innings.matchId);
  if (updatedMatch) {
    buildMatchBroadcastPayload(updatedMatch)
      .then((p) => { if (p) broadcastScoreUpdate(p); })
      .catch(() => {});
  }

  return { success: true, updatedMatch };
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. TOURNAMENT STATS & LEADERBOARDS (All Matches, Top Batters, Top Bowlers, MVP)
// ─────────────────────────────────────────────────────────────────────────────

export interface TournamentStatsResult {
  allMatches: Array<{
    id: string;
    status: MatchStatusType;
    scheduledAt: string | null;
    venue: string | null;
    resultNote: string | null;
    winnerTeamId: string | null;
    teamA: { id: string; name: string; shortName: string; logoUrl: string | null };
    teamB: { id: string; name: string; shortName: string; logoUrl: string | null };
    innings: Array<{
      inningsNumber: number;
      battingTeamId: string;
      runs: number;
      wickets: number;
      overs: number;
      balls: number;
      isSuperOver: boolean;
    }>;
  }>;
  topBatters: Array<{
    playerId: string;
    playerName: string;
    teamName: string;
    teamShortName: string;
    teamLogoUrl: string | null;
    inningsCount: number;
    totalRuns: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    highestScore: number;
    strikeRate: number;
    average: number;
    fifties: number;
  }>;
  topBowlers: Array<{
    playerId: string;
    playerName: string;
    teamName: string;
    teamShortName: string;
    teamLogoUrl: string | null;
    inningsCount: number;
    oversFormatted: string;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economyRate: number;
    bestFigures: string;
  }>;
  mvpLeaderboard: Array<{
    rank: number;
    playerId: string;
    playerName: string;
    teamName: string;
    teamShortName: string;
    teamLogoUrl: string | null;
    role: string;
    mvpPoints: number;
    runs: number;
    wickets: number;
    fours: number;
    sixes: number;
    maidens: number;
    highestScore: number;
    bestBowling: string;
  }>;
}

export async function getTournamentStats(): Promise<TournamentStatsResult> {
  // 1. Fetch all matches with team and innings info
  const matches = await (prisma as any).match.findMany({
    orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      teamA: true,
      teamB: true,
      winnerTeam: true,
      innings: {
        orderBy: { inningsNumber: 'asc' },
        include: {
          battingTeam: true,
        },
      },
    },
  });

  const formattedMatches = matches.map((m: any) => ({
    id: m.id,
    status: m.status,
    scheduledAt: m.scheduledAt ? new Date(m.scheduledAt).toISOString() : null,
    venue: m.venue,
    resultNote: m.resultNote,
    winnerTeamId: m.winnerTeamId,
    teamA: {
      id: m.teamA.id,
      name: m.teamA.name,
      shortName: m.teamA.shortName,
      logoUrl: m.teamA.logoUrl,
    },
    teamB: {
      id: m.teamB.id,
      name: m.teamB.name,
      shortName: m.teamB.shortName,
      logoUrl: m.teamB.logoUrl,
    },
    innings: (m.innings || []).map((inn: any) => ({
      inningsNumber: inn.inningsNumber,
      battingTeamId: inn.battingTeamId,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      balls: inn.balls,
      isSuperOver: inn.inningsNumber >= 3,
    })),
  }));

  // 2. Fetch all batting performances
  const battingScores = await (prisma as any).inningsBatter.findMany({
    include: {
      player: {
        include: {
          teamPlayers: {
            include: { team: true },
          },
        },
      },
      innings: {
        include: {
          battingTeam: true,
        },
      },
    },
  });

  // 3. Fetch all bowling performances
  const bowlingScores = await (prisma as any).inningsBowler.findMany({
    include: {
      player: {
        include: {
          teamPlayers: {
            include: { team: true },
          },
        },
      },
      innings: {
        include: {
          bowlingTeam: true,
        },
      },
    },
  });

  // Map batting stats by playerId
  const batterMap: Record<string, {
    playerId: string;
    playerName: string;
    teamName: string;
    teamShortName: string;
    teamLogoUrl: string | null;
    role: string;
    inningsCount: number;
    totalRuns: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    highestScore: number;
    dismissedCount: number;
    fifties: number;
  }> = {};

  for (const b of battingScores) {
    if (!b.player) continue;
    const pid = b.playerId;
    const team = b.innings?.battingTeam || b.player?.teamPlayers?.[0]?.team;

    if (!batterMap[pid]) {
      batterMap[pid] = {
        playerId: pid,
        playerName: b.player.name,
        teamName: team?.name || 'Unknown',
        teamShortName: team?.shortName || 'UNK',
        teamLogoUrl: team?.logoUrl || null,
        role: b.player.role || 'BATTER',
        inningsCount: 0,
        totalRuns: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        highestScore: 0,
        dismissedCount: 0,
        fifties: 0,
      };
    }

    if (b.balls > 0 || b.runs > 0 || b.isOut) {
      batterMap[pid].inningsCount += 1;
      batterMap[pid].totalRuns += b.runs || 0;
      batterMap[pid].ballsFaced += b.balls || 0;
      batterMap[pid].fours += b.fours || 0;
      batterMap[pid].sixes += b.sixes || 0;
      if ((b.runs || 0) > batterMap[pid].highestScore) {
        batterMap[pid].highestScore = b.runs;
      }
      if (b.isOut) {
        batterMap[pid].dismissedCount += 1;
      }
      if ((b.runs || 0) >= 50) {
        batterMap[pid].fifties += 1;
      }
    }
  }

  const topBatters = Object.values(batterMap)
    .filter((b) => b.inningsCount > 0 || b.totalRuns > 0)
    .map((b) => {
      const strikeRate = b.ballsFaced > 0 ? Number(((b.totalRuns / b.ballsFaced) * 100).toFixed(1)) : 0;
      const average = b.dismissedCount > 0 ? Number((b.totalRuns / b.dismissedCount).toFixed(1)) : b.totalRuns;
      return {
        playerId: b.playerId,
        playerName: b.playerName,
        teamName: b.teamName,
        teamShortName: b.teamShortName,
        teamLogoUrl: b.teamLogoUrl,
        inningsCount: b.inningsCount,
        totalRuns: b.totalRuns,
        ballsFaced: b.ballsFaced,
        fours: b.fours,
        sixes: b.sixes,
        highestScore: b.highestScore,
        strikeRate,
        average,
        fifties: b.fifties,
      };
    })
    .sort((a, b) => b.totalRuns - a.totalRuns || b.highestScore - a.highestScore || b.strikeRate - a.strikeRate);

  // Map bowling stats by playerId
  const bowlerMap: Record<string, {
    playerId: string;
    playerName: string;
    teamName: string;
    teamShortName: string;
    teamLogoUrl: string | null;
    role: string;
    inningsCount: number;
    totalBalls: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    bestWickets: number;
    bestRuns: number;
  }> = {};

  for (const bw of bowlingScores) {
    if (!bw.player) continue;
    const pid = bw.playerId;
    const team = bw.innings?.bowlingTeam || bw.player?.teamPlayers?.[0]?.team;

    if (!bowlerMap[pid]) {
      bowlerMap[pid] = {
        playerId: pid,
        playerName: bw.player.name,
        teamName: team?.name || 'Unknown',
        teamShortName: team?.shortName || 'UNK',
        teamLogoUrl: team?.logoUrl || null,
        role: bw.player.role || 'BOWLER',
        inningsCount: 0,
        totalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        bestWickets: 0,
        bestRuns: 999,
      };
    }

    const ballsInInnings = (bw.overs || 0) * 6 + (bw.balls || 0);
    if (ballsInInnings > 0 || (bw.wickets || 0) > 0) {
      bowlerMap[pid].inningsCount += 1;
      bowlerMap[pid].totalBalls += ballsInInnings;
      bowlerMap[pid].maidens += bw.maidens || 0;
      bowlerMap[pid].runsConceded += bw.runsConceded || 0;
      bowlerMap[pid].wickets += bw.wickets || 0;

      const w = bw.wickets || 0;
      const r = bw.runsConceded || 0;
      if (w > bowlerMap[pid].bestWickets || (w === bowlerMap[pid].bestWickets && r < bowlerMap[pid].bestRuns)) {
        bowlerMap[pid].bestWickets = w;
        bowlerMap[pid].bestRuns = r;
      }
    }
  }

  const topBowlers = Object.values(bowlerMap)
    .filter((bw) => bw.totalBalls > 0 || bw.wickets > 0)
    .map((bw) => {
      const fullOvers = Math.floor(bw.totalBalls / 6);
      const remBalls = bw.totalBalls % 6;
      const oversFormatted = `${fullOvers}${remBalls > 0 ? `.${remBalls}` : '.0'}`;
      const oversFloat = bw.totalBalls / 6;
      const economyRate = oversFloat > 0 ? Number((bw.runsConceded / oversFloat).toFixed(2)) : 0;
      const bestFigures = bw.bestWickets > 0 || bw.bestRuns < 999 ? `${bw.bestWickets}/${bw.bestRuns === 999 ? 0 : bw.bestRuns}` : '-';

      return {
        playerId: bw.playerId,
        playerName: bw.playerName,
        teamName: bw.teamName,
        teamShortName: bw.teamShortName,
        teamLogoUrl: bw.teamLogoUrl,
        inningsCount: bw.inningsCount,
        oversFormatted,
        maidens: bw.maidens,
        runsConceded: bw.runsConceded,
        wickets: bw.wickets,
        economyRate,
        bestFigures,
      };
    })
    .sort((a, b) => b.wickets - a.wickets || a.economyRate - b.economyRate || a.runsConceded - b.runsConceded);

  // 4. Calculate Man of the Series MVP Leaderboard
  const allPlayerIds = Array.from(new Set([...Object.keys(batterMap), ...Object.keys(bowlerMap)]));
  const mvpList = allPlayerIds.map((pid) => {
    const bat = batterMap[pid];
    const bowl = bowlerMap[pid];

    const playerName = bat?.playerName || bowl?.playerName || 'Unknown';
    const teamName = bat?.teamName || bowl?.teamName || 'Unknown';
    const teamShortName = bat?.teamShortName || bowl?.teamShortName || 'UNK';
    const teamLogoUrl = bat?.teamLogoUrl || bowl?.teamLogoUrl || null;
    const role = bat?.role || bowl?.role || 'ALL_ROUNDER';

    const runs = bat?.totalRuns || 0;
    const fours = bat?.fours || 0;
    const sixes = bat?.sixes || 0;
    const highestScore = bat?.highestScore || 0;
    const fifties = bat?.fifties || 0;

    const wickets = bowl?.wickets || 0;
    const maidens = bowl?.maidens || 0;
    const bestWickets = bowl?.bestWickets || 0;
    const bestRuns = bowl?.bestRuns || 0;
    const bestBowling = bestWickets > 0 ? `${bestWickets}/${bestRuns === 999 ? 0 : bestRuns}` : '-';

    // MVP Points Formula:
    // Batting: 1 pt/run + 1.5 pt/4 + 3 pt/6 + 25 pt per fifty
    // Bowling: 25 pt/wicket + 15 pt/maiden + 25 pt if bestWickets >= 3
    const batPoints = runs * 1.0 + fours * 1.5 + sixes * 3.0 + fifties * 25;
    const bowlPoints = wickets * 25 + maidens * 15 + (bestWickets >= 3 ? 25 : 0);
    const totalMvp = Math.round(batPoints + bowlPoints);

    return {
      rank: 0,
      playerId: pid,
      playerName,
      teamName,
      teamShortName,
      teamLogoUrl,
      role,
      mvpPoints: totalMvp,
      runs,
      wickets,
      fours,
      sixes,
      maidens,
      highestScore,
      bestBowling,
    };
  });

  const sortedMvp = mvpList
    .filter((p) => p.mvpPoints > 0)
    .sort((a, b) => b.mvpPoints - a.mvpPoints || b.runs - a.runs || b.wickets - a.wickets)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  return {
    allMatches: formattedMatches,
    topBatters,
    topBowlers,
    mvpLeaderboard: sortedMvp,
  };
}

