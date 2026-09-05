import { prisma } from 'database';
import {
  computeStageStandings,
  type TeamStanding,
  type MatchData,
} from './nrr-engine';
import { getInningsWicketLimit } from '../scoring/scoring-rules';

export interface TournamentOverview {
  tournament: {
    id: string;
    name: string;
    season: string;
    format: string;
    status: string;
  };
  teams: Array<{
    id: string;
    name: string;
    shortName: string;
    logoUrl: string | null;
    groupName: string | null;
    seed: number | null;
    qualificationStatus: string | null;
  }>;
  groups: {
    groupA: { teams: any[]; standings: TeamStanding[]; matches: any[] };
    groupB: { teams: any[]; standings: TeamStanding[]; matches: any[] };
    groupC: { teams: any[]; standings: TeamStanding[]; matches: any[] };
  };
  wildcard: {
    teams: any[];
    standings: TeamStanding[];
    matches: any[];
    qualifier: any | null;
  };
  playoffs: {
    seeds: Array<{ seedNumber: number; team: any | null; label: string }>;
    qualifier1: any | null;
    eliminator: any | null;
    qualifier2: any | null;
    final: any | null;
    champion: any | null;
  };
  matches: any[];
  progress: {
    totalMatches: number;
    completedMatches: number;
    currentStage: 'GROUP' | 'WILDCARD' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED';
  };
}

/**
 * Direct Postgres helper for creating matches with stage, groupName, matchNumber, bracketSlot.
 */
async function createMatchRecord(data: {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  venue?: string | null;
  scheduledAt: Date;
  status: string;
  oversPerInnings: number;
  ballsPerOver: number;
  stage: string;
  groupName?: string | null;
  matchNumber: number;
  bracketSlot: string;
}) {
  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO "Match" ("id", "tournamentId", "teamAId", "teamBId", "venue", "scheduledAt", "status", "oversPerInnings", "ballsPerOver", "stage", "groupName", "matchNumber", "bracketSlot", "currentInnings", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::"MatchStatus", $7, $8, $9, $10, $11, $12, 1, NOW(), NOW())`,
    data.tournamentId,
    data.teamAId,
    data.teamBId,
    data.venue || null,
    data.scheduledAt,
    data.status,
    data.oversPerInnings,
    data.ballsPerOver,
    data.stage,
    data.groupName || null,
    data.matchNumber,
    data.bracketSlot
  );
}

/**
 * Direct Postgres helper for updating qualificationStatus.
 */
async function updateTeamsQualification(tournamentId: string, teamIds: string[], status: string) {
  for (const tid of teamIds) {
    if (!tid) continue;
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "TournamentTeam" SET "qualificationStatus" = $1 WHERE "tournamentId" = $2 AND "teamId" = $3`,
      status,
      tournamentId,
      tid
    );
  }
}

/**
 * Retrieves the comprehensive, data-driven tournament overview.
 * STANDINGS AND NRR ARE CALCULATED DIRECTLY FROM COMPLETED RAW MATCH RECORDS.
 */
export async function getTournamentOverview(tournamentId?: string): Promise<TournamentOverview | null> {
  // 1. Fetch active tournament
  let tournament = tournamentId
    ? await (prisma as any).tournament.findUnique({ where: { id: tournamentId } })
    : await (prisma as any).tournament.findFirst({
        where: { status: { in: ['REGISTRATION', 'SCHEDULED', 'LIVE', 'KNOCKOUT', 'DRAFT'] } },
        orderBy: { createdAt: 'desc' },
      });

  if (!tournament) {
    tournament = await (prisma as any).tournament.findFirst({ orderBy: { createdAt: 'desc' } });
  }

  if (!tournament) return null;

  // 2. Fetch tournament teams and matches
  const [tournamentTeams, rawMatches] = await Promise.all([
    (prisma as any).tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
    }),
    (prisma as any).match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        teamA: true,
        teamB: true,
        winnerTeam: true,
        innings: {
          include: {
            ballEvents: {
              select: { isLegal: true, extraType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  rawMatches.sort((a: any, b: any) => ((a.matchNumber || 999) - (b.matchNumber || 999)) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

  const teams = tournamentTeams.map((tt: any) => ({
    id: tt.team.id,
    name: tt.team.name,
    shortName: tt.team.shortName,
    logoUrl: tt.team.logoUrl,
    groupName: tt.groupName || null,
    seed: tt.seed || null,
    qualificationStatus: tt.qualificationStatus || 'PENDING',
  }));

  const matches: MatchData[] = rawMatches.map((m: any) => ({
    id: m.id,
    tournamentId: m.tournamentId,
    stage: m.stage || (m.matchNumber && m.matchNumber <= 9 ? 'GROUP' : m.matchNumber && m.matchNumber <= 12 ? 'WILDCARD' : 'PLAYOFF'),
    groupName: m.groupName || null,
    matchNumber: m.matchNumber || null,
    bracketSlot: m.bracketSlot || null,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    status: m.status,
    result: (m.resultNote && m.resultNote.includes('NO_RESULT')) || m.status === 'ABANDONED' ? 'NO_RESULT' : (m.status === 'COMPLETED' && !m.winnerTeamId ? 'TIE' : m.winnerTeamId ? 'WIN' : null),
    winnerTeamId: m.winnerTeamId || null,
    oversPerInnings: m.oversPerInnings || 4,
    ballsPerOver: m.ballsPerOver || 4,
    innings: (m.innings || []).map((i: any) => ({
      id: i.id,
      inningsNumber: i.inningsNumber,
      battingTeamId: i.battingTeamId,
      bowlingTeamId: i.bowlingTeamId,
      runs: i.runs,
      wickets: i.wickets,
      overs: i.overs,
      balls: i.balls,
      status: i.status,
      isAllOut: i.isAllOut ?? (i.wickets >= getInningsWicketLimit(i, m)),
      ballEvents: i.ballEvents || [],
    })),
  }));

  // 3. Compute Group Stage Standings (Strictly ball-based Softball NRR)
  const groupAStandings = computeStageStandings(
    teams.filter((t: any) => t.groupName === 'GROUP_A'),
    matches,
    'GROUP',
    'GROUP_A'
  );

  const groupBStandings = computeStageStandings(
    teams.filter((t: any) => t.groupName === 'GROUP_B'),
    matches,
    'GROUP',
    'GROUP_B'
  );

  const groupCStandings = computeStageStandings(
    teams.filter((t: any) => t.groupName === 'GROUP_C'),
    matches,
    'GROUP',
    'GROUP_C'
  );

  // Determine stage progression
  const groupAMatches = rawMatches.filter((m: any) => m.groupName === 'GROUP_A' || (m.matchNumber && m.matchNumber >= 1 && m.matchNumber <= 3));
  const groupBMatches = rawMatches.filter((m: any) => m.groupName === 'GROUP_B' || (m.matchNumber && m.matchNumber >= 4 && m.matchNumber <= 6));
  const groupCMatches = rawMatches.filter((m: any) => m.groupName === 'GROUP_C' || (m.matchNumber && m.matchNumber >= 7 && m.matchNumber <= 9));

  const groupAComplete = groupAMatches.length === 3 && groupAMatches.every((m: any) => m.status === 'COMPLETED');
  const groupBComplete = groupBMatches.length === 3 && groupBMatches.every((m: any) => m.status === 'COMPLETED');
  const groupCComplete = groupCMatches.length === 3 && groupCMatches.every((m: any) => m.status === 'COMPLETED');

  const groupStageMatches = rawMatches.filter((m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 9));
  const groupStageComplete = groupStageMatches.length === 9 && groupStageMatches.every((m: any) => m.status === 'COMPLETED');

  // Authoritative Group Winners & Runners-Up: ONLY confirmed when that group is 100% completed
  const groupAWinner = groupAComplete && groupAStandings[0] ? teams.find((t: any) => t.id === groupAStandings[0].teamId) : null;
  const groupBWinner = groupBComplete && groupBStandings[0] ? teams.find((t: any) => t.id === groupBStandings[0].teamId) : null;
  const groupCWinner = groupCComplete && groupCStandings[0] ? teams.find((t: any) => t.id === groupCStandings[0].teamId) : null;

  const groupARunnerUp = groupAComplete && groupAStandings[1] ? teams.find((t: any) => t.id === groupAStandings[1].teamId) : null;
  const groupBRunnerUp = groupBComplete && groupBStandings[1] ? teams.find((t: any) => t.id === groupBStandings[1].teamId) : null;
  const groupCRunnerUp = groupCComplete && groupCStandings[1] ? teams.find((t: any) => t.id === groupCStandings[1].teamId) : null;

  // Wildcard teams: derived from actual match fixtures if generated, or confirmed runners-up
  const wildcardMatches = rawMatches.filter((m: any) => m.stage === 'WILDCARD' || (m.matchNumber && m.matchNumber >= 10 && m.matchNumber <= 12));
  const existingWildcardTeamIds = new Set<string>();
  wildcardMatches.forEach((m: any) => {
    if (m.teamAId) existingWildcardTeamIds.add(m.teamAId);
    if (m.teamBId) existingWildcardTeamIds.add(m.teamBId);
  });

  const wildcardTeams = existingWildcardTeamIds.size > 0
    ? teams.filter((t: any) => existingWildcardTeamIds.has(t.id))
    : [groupARunnerUp, groupBRunnerUp, groupCRunnerUp].filter(Boolean);
  
  // Wildcard standings computed strictly from Wildcard Stage matches
  const wildcardStandings = computeStageStandings(wildcardTeams, matches, 'WILDCARD');
  const wildcardComplete = wildcardMatches.length === 3 && wildcardMatches.every((m: any) => m.status === 'COMPLETED');

  // Wildcard Qualifier: STRICT BRACKET TRUTH - ONLY confirmed when Wildcard is 100% complete
  const wildcardQualifier = (wildcardComplete && wildcardStandings[0]) ? teams.find((t: any) => t.id === wildcardStandings[0].teamId) : null;

  // Final Four Seeding:
  // Group winners ranked #1, #2, #3 STRICT BRACKET TRUTH: ONLY confirmed when ALL 9 group matches are COMPLETED
  let seed1Team: any = null;
  let seed2Team: any = null;
  let seed3Team: any = null;

  if (groupStageComplete && groupAWinner && groupBWinner && groupCWinner) {
    const groupWinnersStandings = [
      groupAStandings[0],
      groupBStandings[0],
      groupCStandings[0],
    ].filter(Boolean);

    groupWinnersStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (Math.abs(b.nrr - a.nrr) > 0.000001) return b.nrr - a.nrr;
      if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
      return a.teamName.localeCompare(b.teamName);
    });

    seed1Team = groupWinnersStandings[0] ? teams.find((t: any) => t.id === groupWinnersStandings[0].teamId) : null;
    seed2Team = groupWinnersStandings[1] ? teams.find((t: any) => t.id === groupWinnersStandings[1].teamId) : null;
    seed3Team = groupWinnersStandings[2] ? teams.find((t: any) => t.id === groupWinnersStandings[2].teamId) : null;
  }

  // Seed 4 is ALWAYS and ONLY the confirmed Wildcard Qualifier
  const seed4Team = wildcardQualifier;

  // Playoffs matches
  const qualifier1 = rawMatches.find((m: any) => m.stage === 'QUALIFIER_1' || m.bracketSlot === 'Q1' || m.matchNumber === 13) || null;
  const eliminator = rawMatches.find((m: any) => m.stage === 'ELIMINATOR' || m.bracketSlot === 'ELIM' || m.matchNumber === 14) || null;
  const qualifier2 = rawMatches.find((m: any) => m.stage === 'QUALIFIER_2' || m.bracketSlot === 'Q2' || m.matchNumber === 15) || null;
  const finalMatch = rawMatches.find((m: any) => m.stage === 'FINAL' || m.bracketSlot === 'FINAL' || m.matchNumber === 16) || null;

  // Champion
  const championTeam = finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerTeam
    ? finalMatch.winnerTeam
    : null;

  // Overall progress
  const completedCount = rawMatches.filter((m: any) => m.status === 'COMPLETED').length;
  let currentStage: 'GROUP' | 'WILDCARD' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED' = 'GROUP';
  if (finalMatch && finalMatch.status === 'COMPLETED') {
    currentStage = 'COMPLETED';
  } else if (finalMatch && (finalMatch.status === 'LIVE' || (qualifier1?.status === 'COMPLETED' && qualifier2?.status === 'COMPLETED'))) {
    currentStage = 'FINAL';
  } else if (
    wildcardComplete ||
    (qualifier1 && (qualifier1.status === 'LIVE' || qualifier1.status === 'COMPLETED')) ||
    (eliminator && (eliminator.status === 'LIVE' || eliminator.status === 'COMPLETED')) ||
    (qualifier2 && (qualifier2.status === 'LIVE' || qualifier2.status === 'COMPLETED'))
  ) {
    currentStage = 'PLAYOFFS';
  } else if (
    groupStageComplete ||
    wildcardMatches.some((m: any) => m.status === 'LIVE' || m.status === 'COMPLETED')
  ) {
    currentStage = 'WILDCARD';
  } else {
    currentStage = 'GROUP';
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      season: tournament.season,
      format: tournament.format,
      status: tournament.status,
    },
    teams,
    groups: {
      groupA: { teams: teams.filter((t: any) => t.groupName === 'GROUP_A'), standings: groupAStandings, matches: groupAMatches },
      groupB: { teams: teams.filter((t: any) => t.groupName === 'GROUP_B'), standings: groupBStandings, matches: groupBMatches },
      groupC: { teams: teams.filter((t: any) => t.groupName === 'GROUP_C'), standings: groupCStandings, matches: groupCMatches },
    },
    wildcard: {
      teams: wildcardTeams,
      standings: wildcardStandings,
      matches: wildcardMatches,
      qualifier: wildcardQualifier,
    },
    playoffs: {
      seeds: [
        { seedNumber: 1, team: seed1Team, label: 'Best Group Winner' },
        { seedNumber: 2, team: seed2Team, label: '2nd Best Group Winner' },
        { seedNumber: 3, team: seed3Team, label: '3rd Best Group Winner' },
        { seedNumber: 4, team: seed4Team, label: 'Wildcard Qualifier' },
      ],
      qualifier1,
      eliminator,
      qualifier2,
      final: finalMatch,
      champion: championTeam,
    },
    matches: rawMatches,
    progress: {
      totalMatches: 16,
      completedMatches: completedCount,
      currentStage,
    },
  };
}

/**
 * Assigns 9 teams into Group A, Group B, Group C.
 */
export async function assignTeamsToGroups(
  tournamentId: string,
  assignments: Record<string, 'GROUP_A' | 'GROUP_B' | 'GROUP_C'>
): Promise<{ success: boolean; error?: string }> {
  const teamIds = Object.keys(assignments);
  if (teamIds.length === 0) {
    return { success: false, error: 'No team assignments provided.' };
  }

  // Count groups
  const counts = { GROUP_A: 0, GROUP_B: 0, GROUP_C: 0 };
  for (const tId of teamIds) {
    counts[assignments[tId]]++;
  }

  // Save assignments into TournamentTeam via resilient raw Postgres UPSERT
  for (const teamId of teamIds) {
    const groupName = assignments[teamId];
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO "TournamentTeam" ("id", "tournamentId", "teamId", "groupName", "matchesPlayed", "wins", "losses", "ties", "noResults", "points", "runsFor", "legalBallsFaced", "runsAgainst", "legalBallsBowled")
       VALUES (gen_random_uuid(), $1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT ("tournamentId", "teamId") DO UPDATE SET "groupName" = EXCLUDED."groupName"`,
      tournamentId,
      teamId,
      groupName
    );
  }

  return { success: true };
}

/**
 * Configures the stage-specific over limits and balls per over.
 */
export async function configureTournamentStages(
  tournamentId: string,
  settings: {
    ballsPerOver?: number;
    groupOvers?: number;
    wildcardOvers?: number;
    playoffOvers?: number;
    finalOvers?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  // Lock Check: Do not allow silent changes to format once fixtures have been generated
  const matchCount = await (prisma as any).match.count({
    where: { tournamentId },
  });
  if (matchCount > 0) {
    return {
      success: false,
      error: 'Tournament format is LOCKED. Fixtures have already been generated. Changing stage formats requires an explicit tournament reset to preserve NRR integrity.',
    };
  }

  const ballsPerOver = settings.ballsPerOver || 4;
  const stages = [
    { name: 'GROUP', stageOrder: 1, overs: settings.groupOvers || 4, ballsPerOver },
    { name: 'WILDCARD', stageOrder: 2, overs: settings.wildcardOvers || 5, ballsPerOver },
    { name: 'PLAYOFFS', stageOrder: 3, overs: settings.playoffOvers || 6, ballsPerOver },
    { name: 'FINAL', stageOrder: 4, overs: settings.finalOvers || 6, ballsPerOver },
  ];

  for (const s of stages) {
    const existing = await (prisma as any).tournamentStage.findFirst({
      where: { tournamentId, name: s.name },
    });
    if (existing) {
      await (prisma as any).tournamentStage.update({
        where: { id: existing.id },
        data: {
          oversPerInnings: s.overs,
          ballsPerOver: s.ballsPerOver,
        },
      });
    } else {
      await (prisma as any).tournamentStage.create({
        data: {
          tournamentId,
          name: s.name,
          stageOrder: s.stageOrder,
          oversPerInnings: s.overs,
          ballsPerOver: s.ballsPerOver,
        },
      });
    }
  }

  return { success: true };
}

/**
 * Explicitly resets tournament fixtures, innings, and deliveries, returning the tournament
 * to DRAFT / UPCOMING state so that format rules or group assignments can be reconfigured.
 * CRITICAL: Preserves core Team and Player records. Only deletes matches and resets tournament stage records.
 */
export async function resetTournamentFixtures(
  tournamentId: string,
  confirmationText: string
): Promise<{ success: boolean; error?: string }> {
  if (confirmationText !== 'RESET_TOURNAMENT') {
    return {
      success: false,
      error: 'Confirmation mismatch. You must type "RESET_TOURNAMENT" to confirm resetting fixtures.',
    };
  }

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  // 1. Fetch match IDs for this tournament
  const matches = await (prisma as any).match.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  const matchIds = matches.map((m: any) => m.id);

  if (matchIds.length > 0) {
    // Delete ball deliveries, innings, matches
    await (prisma as any).ballDelivery.deleteMany({
      where: { matchId: { in: matchIds } },
    });
    await (prisma as any).innings.deleteMany({
      where: { matchId: { in: matchIds } },
    });
    await (prisma as any).match.deleteMany({
      where: { id: { in: matchIds } },
    });
  }

  // 2. Reset tournamentTeam standings and qualification status
  await (prisma as any).tournamentTeam.updateMany({
    where: { tournamentId },
    data: {
      points: 0,
      nrr: 0,
      qualificationStatus: 'PENDING',
    },
  });

  // 3. Reset tournament status back to UPCOMING
  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'UPCOMING',
    },
  });

  return { success: true };
}

/**
 * Generates the 9 round-robin matches for Group Stage.
 * Group A: M1 (A1 vs A2), M2 (A2 vs A3), M3 (A1 vs A3)
 * Group B: M4 (B1 vs B2), M5 (B2 vs B3), M6 (B1 vs B3)
 * Group C: M7 (C1 vs C2), M8 (C2 vs C3), M9 (C1 vs C3)
 */
export async function generateGroupStageFixtures(
  tournamentId: string,
  settings: {
    oversPerInnings?: number;
    ballsPerOver?: number;
    groupOvers?: number;
    wildcardOvers?: number;
    playoffOvers?: number;
    finalOvers?: number;
    venue?: string;
    startDate?: Date | string;
  } = {}
): Promise<{ success: boolean; createdCount?: number; error?: string }> {
  // Lock Check: Verify no fixtures already exist
  const existingMatchCount = await (prisma as any).match.count({
    where: { tournamentId },
  });
  if (existingMatchCount > 0) {
    return {
      success: false,
      error: 'Fixtures already exist for this tournament. Please reset existing fixtures before generating a new tournament schedule.',
    };
  }

  const ballsPerOver = settings.ballsPerOver || 4;
  const oversPerInnings = settings.groupOvers || settings.oversPerInnings || 4;
  const venue = settings.venue || 'Ratmalana CGR Ground';
  const baseDate = settings.startDate ? new Date(settings.startDate) : new Date();

  // Save format configuration across stages
  const stageConfigResult = await configureTournamentStages(tournamentId, {
    ballsPerOver,
    groupOvers: oversPerInnings,
    wildcardOvers: settings.wildcardOvers || 5,
    playoffOvers: settings.playoffOvers || 6,
    finalOvers: settings.finalOvers || 6,
  });
  if (!stageConfigResult.success) {
    return { success: false, error: stageConfigResult.error };
  }

  // 1. Fetch group assignments
  const tournamentTeams = await (prisma as any).tournamentTeam.findMany({
    where: { tournamentId },
    include: { team: true },
  });

  const groupA = tournamentTeams.filter((tt: any) => tt.groupName === 'GROUP_A');
  const groupB = tournamentTeams.filter((tt: any) => tt.groupName === 'GROUP_B');
  const groupC = tournamentTeams.filter((tt: any) => tt.groupName === 'GROUP_C');

  if (groupA.length < 3 || groupB.length < 3 || groupC.length < 3) {
    return {
      success: false,
      error: `Each group must have exactly 3 teams. Found: Group A (${groupA.length}), Group B (${groupB.length}), Group C (${groupC.length}).`,
    };
  }

  // Check if matches 1-9 already exist
  const allExistingMatches = await (prisma as any).match.findMany({
    where: { tournamentId },
  });
  const existingMatches = allExistingMatches.filter((m: any) => m.matchNumber && m.matchNumber <= 9);

  if (existingMatches.length > 0) {
    const started = existingMatches.some((m: any) => m.status === 'LIVE' || m.status === 'COMPLETED');
    if (started) {
      return { success: false, error: 'Group stage matches have already started and cannot be regenerated.' };
    }
    // Delete existing upcoming group matches via raw SQL
    await (prisma as any).$executeRawUnsafe(
      `DELETE FROM "Match" WHERE "tournamentId" = $1 AND "matchNumber" <= 9 AND "status" = 'UPCOMING'`,
      tournamentId
    );
  }

  const fixturePlan = [
    // Group A
    { num: 1, group: 'GROUP_A', slot: 'G1', tA: groupA[0].teamId, tB: groupA[1].teamId, offsetHours: 0 },
    { num: 2, group: 'GROUP_A', slot: 'G2', tA: groupA[1].teamId, tB: groupA[2].teamId, offsetHours: 1 },
    { num: 3, group: 'GROUP_A', slot: 'G3', tA: groupA[0].teamId, tB: groupA[2].teamId, offsetHours: 2 },
    // Group B
    { num: 4, group: 'GROUP_B', slot: 'G4', tA: groupB[0].teamId, tB: groupB[1].teamId, offsetHours: 3 },
    { num: 5, group: 'GROUP_B', slot: 'G5', tA: groupB[1].teamId, tB: groupB[2].teamId, offsetHours: 4 },
    { num: 6, group: 'GROUP_B', slot: 'G6', tA: groupB[0].teamId, tB: groupB[2].teamId, offsetHours: 5 },
    // Group C
    { num: 7, group: 'GROUP_C', slot: 'G7', tA: groupC[0].teamId, tB: groupC[1].teamId, offsetHours: 6 },
    { num: 8, group: 'GROUP_C', slot: 'G8', tA: groupC[1].teamId, tB: groupC[2].teamId, offsetHours: 7 },
    { num: 9, group: 'GROUP_C', slot: 'G9', tA: groupC[0].teamId, tB: groupC[2].teamId, offsetHours: 8 },
  ];

  for (const f of fixturePlan) {
    const scheduled = new Date(baseDate.getTime() + f.offsetHours * 60 * 60 * 1000);
    await createMatchRecord({
      tournamentId,
      teamAId: f.tA,
      teamBId: f.tB,
      venue,
      scheduledAt: scheduled,
      status: 'UPCOMING',
      oversPerInnings,
      ballsPerOver,
      stage: 'GROUP',
      groupName: f.group,
      matchNumber: f.num,
      bracketSlot: f.slot,
    });
  }

  // Update tournament status to SCHEDULED if DRAFT
  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: { status: 'SCHEDULED' },
  });

  return { success: true, createdCount: 9 };
}

/**
 * Evaluates match outcomes and automatically generates the next stage matches.
 * BallEvent -> Innings -> Match result -> Standings -> NRR -> Qualification -> Seeding -> Bracket progression -> Champion
 */
export async function checkAndAdvanceTournament(tournamentId: string): Promise<{
  advanced: boolean;
  message: string;
  stageTriggered?: string;
}> {
  const overview = await getTournamentOverview(tournamentId);
  if (!overview) return { advanced: false, message: 'Tournament not found.' };

  const { matches, groups, wildcard, playoffs } = overview;
  
  // Load tournament-level format configuration
  const stages = await (prisma as any).tournamentStage.findMany({ where: { tournamentId } });
  const groupConfig = stages.find((s: any) => s.name === 'GROUP');
  const wildcardConfig = stages.find((s: any) => s.name === 'WILDCARD');
  const playoffConfig = stages.find((s: any) => s.name === 'PLAYOFFS');
  const finalConfig = stages.find((s: any) => s.name === 'FINAL');

  const ballsPerOver = groupConfig?.ballsPerOver || (matches[0] as any)?.ballsPerOver || 4;
  const wildcardOvers = wildcardConfig?.oversPerInnings || 5;
  const playoffOvers = playoffConfig?.oversPerInnings || 6;
  const finalOvers = finalConfig?.oversPerInnings || 6;

  // -------------------------------------------------------------
  // STAGE 1 -> STAGE 2: Generate Wildcard Matches (M10, M11, M12)
  // -------------------------------------------------------------
  const groupMatches = matches.filter((m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 9));
  const groupStageComplete = groupMatches.length === 9 && groupMatches.every((m: any) => m.status === 'COMPLETED');

  const wildcardMatches = matches.filter((m: any) => m.stage === 'WILDCARD' || (m.matchNumber && m.matchNumber >= 10 && m.matchNumber <= 12));

  if (groupStageComplete && wildcardMatches.length === 0) {
    const rA = groups.groupA.standings[1];
    const rB = groups.groupB.standings[1];
    const rC = groups.groupC.standings[1];

    if (rA && rB && rC) {
      const baseDate = new Date();
      const venue = 'Ratmalana CGR Ground';

      // M10: Runner A vs Runner B
      await createMatchRecord({
        tournamentId,
        teamAId: rA.teamId,
        teamBId: rB.teamId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 1 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: wildcardOvers,
        ballsPerOver,
        stage: 'WILDCARD',
        groupName: 'WILDCARD',
        matchNumber: 10,
        bracketSlot: 'W1',
      });

      // M11: Runner B vs Runner C
      await createMatchRecord({
        tournamentId,
        teamAId: rB.teamId,
        teamBId: rC.teamId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 2 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: wildcardOvers,
        ballsPerOver,
        stage: 'WILDCARD',
        groupName: 'WILDCARD',
        matchNumber: 11,
        bracketSlot: 'W2',
      });

      // M12: Runner A vs Runner C
      await createMatchRecord({
        tournamentId,
        teamAId: rA.teamId,
        teamBId: rC.teamId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 3 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: wildcardOvers,
        ballsPerOver,
        stage: 'WILDCARD',
        groupName: 'WILDCARD',
        matchNumber: 12,
        bracketSlot: 'W3',
      });

      // Update qualification labels for group teams
      await updateTeamsQualification(
        tournamentId,
        [groups.groupA.standings[0]?.teamId, groups.groupB.standings[0]?.teamId, groups.groupC.standings[0]?.teamId].filter(Boolean),
        'QUALIFIED'
      );

      await updateTeamsQualification(
        tournamentId,
        [rA.teamId, rB.teamId, rC.teamId],
        'WILDCARD'
      );

      await updateTeamsQualification(
        tournamentId,
        [groups.groupA.standings[2]?.teamId, groups.groupB.standings[2]?.teamId, groups.groupC.standings[2]?.teamId].filter(Boolean),
        'ELIMINATED'
      );

      return { advanced: true, message: 'Group Stage concluded. Wildcard round-robin fixtures generated (Matches 10–12).', stageTriggered: 'WILDCARD' };
    }
  }

  // -------------------------------------------------------------
  // STAGE 2 -> STAGE 3: Generate Qualifier 1 & Eliminator (M13, M14)
  // -------------------------------------------------------------
  const wildcardComplete = wildcardMatches.length === 3 && wildcardMatches.every((m: any) => m.status === 'COMPLETED');
  const q1 = matches.find((m: any) => m.stage === 'QUALIFIER_1' || m.matchNumber === 13);
  const elim = matches.find((m: any) => m.stage === 'ELIMINATOR' || m.matchNumber === 14);

  if (wildcardComplete && (!q1 || !elim)) {
    const seed1 = playoffs.seeds.find((s) => s.seedNumber === 1)?.team;
    const seed2 = playoffs.seeds.find((s) => s.seedNumber === 2)?.team;
    const seed3 = playoffs.seeds.find((s) => s.seedNumber === 3)?.team;
    const seed4 = playoffs.seeds.find((s) => s.seedNumber === 4)?.team; // Wildcard winner

    if (seed1 && seed2 && seed3 && seed4) {
      const baseDate = new Date();
      const venue = 'Ratmalana CGR Ground';

      // Match 13: Qualifier 1 (Seed 1 vs Seed 2)
      if (!q1) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed1.id,
          teamBId: seed2.id,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 4 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'QUALIFIER_1',
          matchNumber: 13,
          bracketSlot: 'Q1',
        });
      }

      // Match 14: Eliminator (Seed 3 vs Seed 4 [Wildcard])
      if (!elim) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed3.id,
          teamBId: seed4.id,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 5 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'ELIMINATOR',
          matchNumber: 14,
          bracketSlot: 'ELIM',
        });
      }

      // Mark the 2 eliminated wildcard teams
      const eliminatedWildcards = wildcard.standings.slice(1).map((s) => s.teamId);
      if (eliminatedWildcards.length > 0) {
        await updateTeamsQualification(tournamentId, eliminatedWildcards, 'ELIMINATED');
      }

      return { advanced: true, message: 'Wildcard Stage concluded. Playoff fixtures generated (Qualifier 1 and Eliminator).', stageTriggered: 'PLAYOFFS' };
    }
  }

  // -------------------------------------------------------------
  // STAGE 3 -> Qualifier 2 (Match 15): Loser Q1 vs Winner Eliminator
  // -------------------------------------------------------------
  const q2 = matches.find((m: any) => m.stage === 'QUALIFIER_2' || m.matchNumber === 15);
  if (q1 && elim && q1.status === 'COMPLETED' && elim.status === 'COMPLETED' && !q2) {
    const loserQ1Id = q1.winnerTeamId === q1.teamAId ? q1.teamBId : q1.teamAId;
    const winnerElimId = elim.winnerTeamId;

    if (loserQ1Id && winnerElimId) {
      const baseDate = new Date();
      const venue = 'Ratmalana CGR Ground';

      await createMatchRecord({
        tournamentId,
        teamAId: loserQ1Id,
        teamBId: winnerElimId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 6 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: playoffOvers,
        ballsPerOver,
        stage: 'QUALIFIER_2',
        matchNumber: 15,
        bracketSlot: 'Q2',
      });

      // Mark Eliminator loser as eliminated
      const loserElimId = elim.winnerTeamId === elim.teamAId ? elim.teamBId : elim.teamAId;
      if (loserElimId) {
        await updateTeamsQualification(tournamentId, [loserElimId], 'ELIMINATED');
      }

      return { advanced: true, message: 'Qualifier 1 and Eliminator concluded. Qualifier 2 generated (Match 15).', stageTriggered: 'QUALIFIER_2' };
    }
  }

  // -------------------------------------------------------------
  // STAGE 4 -> Final (Match 16): Winner Q1 vs Winner Q2
  // -------------------------------------------------------------
  const finalMatch = matches.find((m: any) => m.stage === 'FINAL' || m.matchNumber === 16);
  if (q1 && q2 && q1.status === 'COMPLETED' && q2.status === 'COMPLETED' && !finalMatch) {
    const winnerQ1Id = q1.winnerTeamId;
    const winnerQ2Id = q2.winnerTeamId;

    if (winnerQ1Id && winnerQ2Id) {
      const baseDate = new Date();
      const venue = 'Ratmalana CGR Ground';

      await createMatchRecord({
        tournamentId,
        teamAId: winnerQ1Id,
        teamBId: winnerQ2Id,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 7 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: finalOvers,
        ballsPerOver,
        stage: 'FINAL',
        matchNumber: 16,
        bracketSlot: 'FINAL',
      });

      // Mark Qualifier 2 loser as eliminated
      const loserQ2Id = q2.winnerTeamId === q2.teamAId ? q2.teamBId : q2.teamAId;
      if (loserQ2Id) {
        await updateTeamsQualification(tournamentId, [loserQ2Id], 'ELIMINATED');
      }

      return { advanced: true, message: 'Qualifier 2 concluded. CPL Final generated (Match 16)!', stageTriggered: 'FINAL' };
    }
  }

  // -------------------------------------------------------------
  // CHAMPION: Final Match Completed -> Crown Winner
  // -------------------------------------------------------------
  if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerTeamId) {
    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });

    await updateTeamsQualification(tournamentId, [finalMatch.winnerTeamId], 'CHAMPION');

    const runnerUpId = finalMatch.winnerTeamId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId;
    if (runnerUpId) {
      await updateTeamsQualification(tournamentId, [runnerUpId], 'ELIMINATED');
    }

    return { advanced: true, message: 'CPL Final concluded! Champions declared.', stageTriggered: 'CHAMPION' };
  }

  return { advanced: false, message: 'No advancement triggers active at this time.' };
}

/**
 * Recomputes all tournament standings from scratch using raw ball events and match data.
 */
export async function recalculateTournamentStandings(tournamentId: string): Promise<{ success: boolean }> {
  const overview = await getTournamentOverview(tournamentId);
  if (!overview) return { success: false };

  // Write cached values to TournamentTeam for read performance
  const allStandings = [
    ...overview.groups.groupA.standings,
    ...overview.groups.groupB.standings,
    ...overview.groups.groupC.standings,
  ];

  for (const s of allStandings) {
    await (prisma as any).$executeRawUnsafe(
      `UPDATE "TournamentTeam"
       SET "matchesPlayed" = $1, "wins" = $2, "losses" = $3, "ties" = $4, "points" = $5, "runsFor" = $6, "runsAgainst" = $7, "nrr" = $8
       WHERE "tournamentId" = $9 AND "teamId" = $10`,
      s.played,
      s.won,
      s.lost,
      s.tied,
      s.points,
      s.runsFor,
      s.runsAgainst,
      s.nrr,
      tournamentId,
      s.teamId
    );
  }

  return { success: true };
}
