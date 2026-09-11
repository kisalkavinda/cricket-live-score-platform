import { prisma } from 'database';
import {
  computeStageStandings,
  type TeamStanding,
  type MatchData,
} from './nrr-engine';
import { getInningsWicketLimit } from '../scoring/scoring-rules';
import { normalizeImageUrl } from '../utils/image-utils';

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
    [key: string]: any;
  };
  groupA?: TeamStanding[];
  groupB?: TeamStanding[];
  qualification: {
    matches: any[];
    match9: any | null; // Group A 2nd vs Group B 2nd
    match10: any | null; // Group A 3rd vs Group B 3rd
    match11: any | null; // Match 9 Loser vs Match 10 Winner
    qualifier1: any | null; // Match 9 Winner (Playoff Seed 3)
    qualifier2: any | null; // Match 11 Winner (Playoff Seed 4)
  };
  playoffs: {
    seeds: Array<{ seedNumber: number; team: any | null; label: string }>;
    match12: any | null; // Playoff 1st vs Playoff 2nd (Winner -> Final, Loser -> M14)
    match13: any | null; // Playoff 3rd vs Playoff 4th (Winner -> M14, Loser -> Eliminated)
    match14: any | null; // M12 Loser vs M13 Winner (Winner -> Final, Loser -> Eliminated)
    final: any | null;   // M12 Winner vs M14 Winner
    champion: any | null;
    runnerUp: any | null;
    // Backwards-compatibility aliases for UI subcomponents
    qualifier1?: any | null;
    eliminator?: any | null;
    qualifier2?: any | null;
  };
  matches: any[];
  progress: {
    totalMatches: number;
    completedMatches: number;
    currentStage: 'GROUP' | 'QUALIFICATION' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED';
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
    await (prisma as any).tournamentTeam.updateMany({
      where: {
        tournamentId,
        teamId: tid,
      },
      data: {
        qualificationStatus: status,
      },
    });
  }
}

function isGroupA(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toUpperCase().replace(/[\s_-]/g, '');
  return n === 'GROUPA' || n === 'A';
}

function isGroupB(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toUpperCase().replace(/[\s_-]/g, '');
  return n === 'GROUPB' || n === 'B';
}

/**
 * Retrieves the comprehensive, data-driven tournament overview for 8 teams, 15 matches.
 * STANDINGS AND NRR ARE CALCULATED DIRECTLY FROM COMPLETED RAW MATCH RECORDS.
 */
export async function getTournamentOverview(tournamentId?: string): Promise<TournamentOverview | null> {
  // 1. Fetch active tournament
  let tournament = tournamentId
    ? await (prisma as any).tournament.findUnique({ where: { id: tournamentId } })
    : await (prisma as any).tournament.findFirst({
        where: {
          status: { in: ['LIVE', 'KNOCKOUT', 'SCHEDULED', 'REGISTRATION', 'DRAFT'] },
          NOT: [
            { name: { startsWith: 'OFFLINE_TEST' } },
            { name: { startsWith: 'TEST_' } },
          ],
        },
        orderBy: [
          { matches: { _count: 'desc' } },
          { tournamentTeams: { _count: 'desc' } },
          { createdAt: 'desc' },
        ],
      });

  if (!tournament) {
    tournament = await (prisma as any).tournament.findFirst({
      where: {
        NOT: [
          { name: { startsWith: 'OFFLINE_TEST' } },
          { name: { startsWith: 'TEST_' } },
        ],
      },
      orderBy: [
        { matches: { _count: 'desc' } },
        { tournamentTeams: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
    });
  }

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

  rawMatches.sort(
    (a: any, b: any) =>
      ((a.matchNumber || 999) - (b.matchNumber || 999)) ||
      (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );

  const teams = tournamentTeams.map((tt: any) => ({
    id: tt.team.id,
    name: tt.team.name,
    shortName: tt.team.shortName,
    logoUrl: normalizeImageUrl(tt.team.logoUrl),
    groupName: tt.groupName || null,
    seed: tt.seed || null,
    qualificationStatus: tt.qualificationStatus || 'PENDING',
  }));

  const matches: MatchData[] = rawMatches.map((m: any) => ({
    id: m.id,
    tournamentId: m.tournamentId,
    stage:
      m.stage ||
      (m.matchNumber && m.matchNumber <= 8
        ? 'GROUP'
        : m.matchNumber && m.matchNumber <= 11
        ? 'QUALIFICATION'
        : m.matchNumber && m.matchNumber <= 14
        ? 'PLAYOFFS'
        : 'FINAL'),
    groupName: m.groupName || null,
    matchNumber: m.matchNumber || null,
    bracketSlot: m.bracketSlot || null,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    status: m.status,
    result:
      (m.resultNote && m.resultNote.includes('NO_RESULT')) || m.status === 'ABANDONED'
        ? 'NO_RESULT'
        : m.status === 'COMPLETED' && !m.winnerTeamId
        ? 'TIE'
        : m.winnerTeamId
        ? 'WIN'
        : null,
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

  // Group Matches (4 matches per group, 8 total, alternating A and B)
  const groupAMatches = rawMatches.filter(
    (m: any) => isGroupA(m.groupName) || (!m.groupName && m.matchNumber && m.matchNumber <= 8 && m.matchNumber % 2 === 1)
  );
  const groupBMatches = rawMatches.filter(
    (m: any) => isGroupB(m.groupName) || (!m.groupName && m.matchNumber && m.matchNumber <= 8 && m.matchNumber % 2 === 0)
  );

  // Group Teams with resilient inference (from groupName, match participation, or default registration order)
  const groupATeamIds = new Set<string>();
  const groupBTeamIds = new Set<string>();

  groupAMatches.forEach((m: any) => {
    if (m.teamAId) groupATeamIds.add(m.teamAId);
    if (m.teamBId) groupATeamIds.add(m.teamBId);
  });
  groupBMatches.forEach((m: any) => {
    if (m.teamAId) groupBTeamIds.add(m.teamAId);
    if (m.teamBId) groupBTeamIds.add(m.teamBId);
  });

  const groupATeams = teams.filter((t: any, idx: number) => {
    if (isGroupA(t.groupName)) return true;
    if (groupATeamIds.has(t.id)) return true;
    if (!t.groupName && !isGroupB(t.groupName) && !groupBTeamIds.has(t.id) && groupATeamIds.size === 0 && idx < 4) return true;
    return false;
  });

  const groupBTeams = teams.filter((t: any, idx: number) => {
    if (isGroupB(t.groupName)) return true;
    if (groupBTeamIds.has(t.id)) return true;
    if (!t.groupName && !isGroupA(t.groupName) && !groupATeamIds.has(t.id) && groupBTeamIds.size === 0 && idx >= 4) return true;
    return false;
  });

  // 3. Compute Group Stage Standings (Strictly ball-based Softball NRR)
  const groupAStandings = computeStageStandings(
    groupATeams.map((t: any) => ({ ...t, groupName: 'GROUP_A' })),
    matches,
    'GROUP',
    'GROUP_A'
  );

  const groupBStandings = computeStageStandings(
    groupBTeams.map((t: any) => ({ ...t, groupName: 'GROUP_B' })),
    matches,
    'GROUP',
    'GROUP_B'
  );

  const groupAComplete = groupAMatches.length === 4 && groupAMatches.every((m: any) => m.status === 'COMPLETED');
  const groupBComplete = groupBMatches.length === 4 && groupBMatches.every((m: any) => m.status === 'COMPLETED');

  const groupStageMatches = rawMatches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 8)
  );
  const groupStageComplete =
    groupStageMatches.length === 8 && groupStageMatches.every((m: any) => m.status === 'COMPLETED');

  // Authoritative Group Positions (Available when group matches are completed)
  const groupAWinner = groupAComplete && groupAStandings[0] ? teams.find((t: any) => t.id === groupAStandings[0].teamId) : null;
  const groupBWinner = groupBComplete && groupBStandings[0] ? teams.find((t: any) => t.id === groupBStandings[0].teamId) : null;

  const groupARunnerUp = groupAComplete && groupAStandings[1] ? teams.find((t: any) => t.id === groupAStandings[1].teamId) : null;
  const groupBRunnerUp = groupBComplete && groupBStandings[1] ? teams.find((t: any) => t.id === groupBStandings[1].teamId) : null;

  // 4. Playoff Qualification Stage (Matches 9, 10, 11)
  const match9 =
    rawMatches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'M9' || m.bracketSlot === 'PQ1') || null;
  const match10 =
    rawMatches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'M10' || m.bracketSlot === 'PQ2') || null;
  const match11 =
    rawMatches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'M11' || m.bracketSlot === 'PQ3') || null;

  const qualificationMatches = [match9, match10, match11].filter(Boolean);

  // Qualifier 1 (Playoff Seed 3): Winner of Match 9 (2nd vs 2nd)
  const qualifier1Team =
    match9 && match9.status === 'COMPLETED' && match9.winnerTeamId
      ? teams.find((t: any) => t.id === match9.winnerTeamId) || null
      : null;

  // Qualifier 2 (Playoff Seed 4): Winner of Match 11 (M9 Loser vs M10 Winner)
  const qualifier2Team =
    match11 && match11.status === 'COMPLETED' && match11.winnerTeamId
      ? teams.find((t: any) => t.id === match11.winnerTeamId) || null
      : null;

  // 5. Four-Team Playoff Seeding
  // Deterministic ranking for Seeds 1 & 2 between the two group winners:
  // 1. Points -> 2. NRR -> 3. Runs For -> 4. Team Name
  let seed1Team: any = null;
  let seed2Team: any = null;

  if (groupStageComplete && groupAWinner && groupBWinner) {
    const groupWinners = [groupAStandings[0], groupBStandings[0]].filter(Boolean);
    groupWinners.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (Math.abs(b.nrr - a.nrr) > 0.000001) return b.nrr - a.nrr;
      if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
      return a.teamName.localeCompare(b.teamName);
    });

    seed1Team = groupWinners[0] ? teams.find((t: any) => t.id === groupWinners[0].teamId) : null;
    seed2Team = groupWinners[1] ? teams.find((t: any) => t.id === groupWinners[1].teamId) : null;
  }

  // Seed 3: Winner of Match 9
  const seed3Team = qualifier1Team;
  // Seed 4: Winner of Match 11
  const seed4Team = qualifier2Team;

  // 6. Playoff Matches (Matches 12, 13, 14) and Grand Final (Match 15)
  const match12 =
    rawMatches.find((m: any) => m.matchNumber === 12 || m.bracketSlot === 'M12' || m.bracketSlot === 'P1' || m.stage === 'QUALIFIER_1') || null;
  const match13 =
    rawMatches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'M13' || m.bracketSlot === 'P2' || m.stage === 'ELIMINATOR') || null;
  const match14 =
    rawMatches.find((m: any) => m.matchNumber === 14 || m.bracketSlot === 'M14' || m.bracketSlot === 'P3' || m.stage === 'QUALIFIER_2') || null;
  const finalMatch =
    rawMatches.find((m: any) => m.matchNumber === 15 || m.bracketSlot === 'M15' || m.bracketSlot === 'FINAL' || m.stage === 'FINAL') || null;

  const championTeam =
    finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerTeam
      ? finalMatch.winnerTeam
      : null;

  const runnerUpTeam =
    finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerTeamId
      ? finalMatch.winnerTeamId === finalMatch.teamAId
        ? finalMatch.teamB
        : finalMatch.teamA
      : null;

  // 7. Progression State
  const completedCount = rawMatches.filter((m: any) => m.status === 'COMPLETED').length;
  let currentStage: 'GROUP' | 'QUALIFICATION' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED' = 'GROUP';

  if (finalMatch && finalMatch.status === 'COMPLETED') {
    currentStage = 'COMPLETED';
  } else if (
    finalMatch &&
    (finalMatch.status === 'LIVE' || (match12?.status === 'COMPLETED' && match14?.status === 'COMPLETED'))
  ) {
    currentStage = 'FINAL';
  } else if (
    (match11 && match11.status === 'COMPLETED') ||
    (match12 && (match12.status === 'LIVE' || match12.status === 'COMPLETED')) ||
    (match13 && (match13.status === 'LIVE' || match13.status === 'COMPLETED')) ||
    (match14 && (match14.status === 'LIVE' || match14.status === 'COMPLETED'))
  ) {
    currentStage = 'PLAYOFFS';
  } else if (
    groupStageComplete ||
    qualificationMatches.some((m: any) => m.status === 'LIVE' || m.status === 'COMPLETED')
  ) {
    currentStage = 'QUALIFICATION';
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
      groupA: {
        teams: groupATeams,
        standings: groupAStandings,
        matches: groupAMatches,
      },
      groupB: {
        teams: groupBTeams,
        standings: groupBStandings,
        matches: groupBMatches,
      },
      GROUP_A: {
        teams: groupATeams,
        standings: groupAStandings,
        matches: groupAMatches,
      },
      GROUP_B: {
        teams: groupBTeams,
        standings: groupBStandings,
        matches: groupBMatches,
      },
    } as any,
    groupA: groupAStandings,
    groupB: groupBStandings,
    qualification: {
      matches: qualificationMatches,
      match9,
      match10,
      match11,
      qualifier1: qualifier1Team,
      qualifier2: qualifier2Team,
    },
    playoffs: {
      seeds: [
        { seedNumber: 1, team: seed1Team, label: 'Best Group Winner' },
        { seedNumber: 2, team: seed2Team, label: '2nd Best Group Winner' },
        { seedNumber: 3, team: seed3Team, label: 'Match 9 Winner' },
        { seedNumber: 4, team: seed4Team, label: 'Match 11 Winner' },
      ],
      match12,
      match13,
      match14,
      final: finalMatch,
      champion: championTeam,
      runnerUp: runnerUpTeam,
      // Aliases for legacy component compatibility
      qualifier1: match12,
      eliminator: match13,
      qualifier2: match14,
    },
    matches: rawMatches,
    progress: {
      totalMatches: 15,
      completedMatches: completedCount,
      currentStage,
    },
  };
}

/**
 * Assigns teams into Group A and Group B (4 teams each, positions A1-A4 and B1-B4).
 * Ensures exactly 4 teams per group and clears group assignment for unassigned teams.
 */
export async function assignTeamsToGroups(
  tournamentId: string,
  assignments: Record<string, 'GROUP_A' | 'GROUP_B' | { group: 'GROUP_A' | 'GROUP_B'; position?: number }>,
  positions?: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const teamIds = Object.keys(assignments);
    if (teamIds.length === 0) {
      return { success: false, error: 'No team assignments provided.' };
    }

    const assignedGroupA: string[] = [];
    const assignedGroupB: string[] = [];

    for (const tId of teamIds) {
      const rawVal = assignments[tId];
      const grp = typeof rawVal === 'string' ? rawVal : rawVal?.group;
      if (grp === 'GROUP_A') assignedGroupA.push(tId);
      else if (grp === 'GROUP_B') assignedGroupB.push(tId);
    }

    if (assignedGroupA.length !== 4 || assignedGroupB.length !== 4) {
      return {
        success: false,
        error: `Must assign exactly 4 teams to Group A and 4 teams to Group B. Currently: Group A (${assignedGroupA.length}/4), Group B (${assignedGroupB.length}/4).`,
      };
    }

    const assignedTeamIds = [...assignedGroupA, ...assignedGroupB];

    // 1. Clear group and seed for any team in this tournament that is not in the assigned 8
    await (prisma as any).tournamentTeam.updateMany({
      where: {
        tournamentId,
        teamId: { notIn: assignedTeamIds },
      },
      data: {
        groupName: null,
        seed: null,
      },
    });

    // 2. Upsert the 8 assigned teams with their group and seed (position 1-4)
    for (const teamId of assignedTeamIds) {
      const rawVal = assignments[teamId];
      const groupName = typeof rawVal === 'string' ? rawVal : rawVal?.group;
      const explicitPos = typeof rawVal === 'object' && rawVal?.position ? rawVal.position : undefined;
      const seed = positions && positions[teamId] ? Number(positions[teamId]) : explicitPos ? Number(explicitPos) : 1;

      await (prisma as any).tournamentTeam.upsert({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId,
          },
        },
        update: {
          groupName,
          seed,
        },
        create: {
          tournamentId,
          teamId,
          groupName,
          seed,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[assignTeamsToGroups] error:', err);
    return { success: false, error: err.message || 'Database error assigning teams to groups.' };
  }
}

/**
 * Unassigns all teams from groups (sets groupName = null, seed = null).
 * Allowed only when no matches/fixtures exist for the tournament.
 */
export async function unassignAllTeams(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const matchCount = await (prisma as any).match.count({
      where: { tournamentId },
    });
    if (matchCount > 0) {
      return {
        success: false,
        error: 'Cannot unassign teams while fixtures exist. Please reset fixtures first.',
      };
    }

    await (prisma as any).tournamentTeam.updateMany({
      where: { tournamentId },
      data: {
        groupName: null,
        seed: null,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('[unassignAllTeams] error:', err);
    return { success: false, error: err.message || 'Failed to unassign teams.' };
  }
}

/**
 * Configures the stage-specific over limits and balls per over for the 4 stages:
 * GROUP, QUALIFICATION, PLAYOFFS, FINAL.
 */
export async function configureTournamentStages(
  tournamentId: string,
  settings: {
    ballsPerOver?: number;
    groupOvers?: number;
    qualificationOvers?: number;
    wildcardOvers?: number; // legacy alias
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
      error:
        'Tournament format is LOCKED. Fixtures have already been generated. Changing stage formats requires an explicit tournament reset to preserve NRR integrity.',
    };
  }

  const ballsPerOver = settings.ballsPerOver || 4;
  const qualOvers = settings.qualificationOvers || settings.wildcardOvers || 5;
  const stages = [
    { name: 'GROUP', stageOrder: 1, overs: settings.groupOvers || 4, ballsPerOver },
    { name: 'QUALIFICATION', stageOrder: 2, overs: qualOvers, ballsPerOver },
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
    try {
      const innings = await (prisma as any).innings.findMany({
        where: { matchId: { in: matchIds } },
        select: { id: true },
      });
      const inningsIds = innings.map((i: any) => i.id);
      if (inningsIds.length > 0) {
        await (prisma as any).ballEvent.deleteMany({
          where: { inningsId: { in: inningsIds } },
        });
        await (prisma as any).inningsBatter.deleteMany({
          where: { inningsId: { in: inningsIds } },
        });
        await (prisma as any).inningsBowler.deleteMany({
          where: { inningsId: { in: inningsIds } },
        });
        await (prisma as any).innings.deleteMany({
          where: { id: { in: inningsIds } },
        });
      }
    } catch (cleanupErr) {
      console.warn('[resetTournamentFixtures] Child table cascade warning:', cleanupErr);
    }

    await (prisma as any).match.deleteMany({
      where: { id: { in: matchIds } },
    });
  }

  // 2. Reset tournamentTeam standings and qualification status
  await (prisma as any).tournamentTeam.updateMany({
    where: { tournamentId },
    data: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      noResults: 0,
      points: 0,
      runsFor: 0,
      legalBallsFaced: 0,
      runsAgainst: 0,
      legalBallsBowled: 0,
      nrr: 0,
      qualificationStatus: 'PENDING',
    },
  });

  // 3. Reset tournament status back to SCHEDULED
  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'SCHEDULED',
    },
  });

  return { success: true };
}

/**
 * Generates the 8 group-stage matches for the 8-team format with alternating groups & rest optimization:
 * Alternating Group Matches (A, B, A, B, A, B, A, B) with zero consecutive matches for any team.
 * All 8 teams play Match 1 in Round 1 (M1-M4) before any team plays Match 2 in Round 2 (M5-M8).
 *
 * Round 1:
 *   Match 1: Group A, A1 vs A2 (G1)
 *   Match 2: Group B, B1 vs B2 (G2)
 *   Match 3: Group A, A3 vs A4 (G3)
 *   Match 4: Group B, B3 vs B4 (G4)
 * Round 2:
 *   Match 5: Group A, A1 vs A4 (G5) [A1 rested 3 matches, A4 rested 1 match]
 *   Match 6: Group B, B1 vs B4 (G6) [B1 rested 3 matches, B4 rested 1 match]
 *   Match 7: Group A, A2 vs A3 (G7) [A2 rested 5 matches, A3 rested 3 matches]
 *   Match 8: Group B, B2 vs B3 (G8) [B2 rested 5 matches, B3 rested 3 matches]
 *
 * Each team plays exactly 2 matches.
 */
export async function generateGroupStageFixtures(
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
      error:
        'Fixtures already exist for this tournament. Please reset existing fixtures before generating a new tournament schedule.',
    };
  }

  const ballsPerOver = settings.ballsPerOver || 4;
  const oversPerInnings = settings.groupOvers || settings.oversPerInnings || 4;
  const qualOvers = settings.qualificationOvers || settings.wildcardOvers || 5;
  const venue = settings.venue || 'Ratmalana CGR Ground';
  const baseDate = settings.startDate ? new Date(settings.startDate) : new Date();

  // Save format configuration across stages
  const stageConfigResult = await configureTournamentStages(tournamentId, {
    ballsPerOver,
    groupOvers: oversPerInnings,
    qualificationOvers: qualOvers,
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
    orderBy: { seed: 'asc' },
  });

  const groupA = tournamentTeams.filter((tt: any) => tt.groupName === 'GROUP_A');
  const groupB = tournamentTeams.filter((tt: any) => tt.groupName === 'GROUP_B');

  if (groupA.length !== 4 || groupB.length !== 4) {
    return {
      success: false,
      error: `Tournament requires exactly 8 teams (4 in Group A, 4 in Group B). Found: Group A (${groupA.length}), Group B (${groupB.length}).`,
    };
  }

  // Check if matches 1-8 already exist
  const allExistingMatches = await (prisma as any).match.findMany({
    where: { tournamentId },
  });
  const existingMatches = allExistingMatches.filter((m: any) => m.matchNumber && m.matchNumber <= 8);

  if (existingMatches.length > 0) {
    const started = existingMatches.some((m: any) => m.status === 'LIVE' || m.status === 'COMPLETED');
    if (started) {
      return { success: false, error: 'Group stage matches have already started and cannot be regenerated.' };
    }
    // Delete existing upcoming group matches via raw SQL
    await (prisma as any).$executeRawUnsafe(
      `DELETE FROM "Match" WHERE "tournamentId" = $1 AND "matchNumber" <= 8 AND "status" = 'UPCOMING'`,
      tournamentId
    );
  }

  // Alternating & non-consecutive fixture plan:
  // Round 1: All 8 teams play 1 match, alternating A and B
  // Round 2: All 8 teams play their 2nd match, alternating A and B, 0 consecutive matches
  const fixturePlan = [
    // Round 1
    { num: 1, group: 'GROUP_A', slot: 'G1', tA: groupA[0].teamId, tB: groupA[1].teamId, offsetHours: 0 },
    { num: 2, group: 'GROUP_B', slot: 'G2', tA: groupB[0].teamId, tB: groupB[1].teamId, offsetHours: 1 },
    { num: 3, group: 'GROUP_A', slot: 'G3', tA: groupA[2].teamId, tB: groupA[3].teamId, offsetHours: 2 },
    { num: 4, group: 'GROUP_B', slot: 'G4', tA: groupB[2].teamId, tB: groupB[3].teamId, offsetHours: 3 },
    // Round 2
    { num: 5, group: 'GROUP_A', slot: 'G5', tA: groupA[0].teamId, tB: groupA[3].teamId, offsetHours: 4 },
    { num: 6, group: 'GROUP_B', slot: 'G6', tA: groupB[0].teamId, tB: groupB[3].teamId, offsetHours: 5 },
    { num: 7, group: 'GROUP_A', slot: 'G7', tA: groupA[1].teamId, tB: groupA[2].teamId, offsetHours: 6 },
    { num: 8, group: 'GROUP_B', slot: 'G8', tA: groupB[1].teamId, tB: groupB[2].teamId, offsetHours: 7 },
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

  return { success: true, createdCount: 8 };
}

/**
 * Evaluates match outcomes and automatically generates the next stage matches.
 * 8 Teams · 15 Matches Progression:
 * Group Stage (M1-M8) -> Playoff Qualification (M9-M11) -> Four-Team Playoff (M12-M14) -> Grand Final (M15)
 */
export async function checkAndAdvanceTournament(tournamentId: string): Promise<{
  advanced: boolean;
  message: string;
  stageTriggered?: string;
}> {
  const overview = await getTournamentOverview(tournamentId);
  if (!overview) return { advanced: false, message: 'Tournament not found.' };

  const { matches, groups, playoffs } = overview;

  // Load tournament-level stage format configuration
  const stages = await (prisma as any).tournamentStage.findMany({ where: { tournamentId } });
  const groupConfig = stages.find((s: any) => s.name === 'GROUP');
  const qualConfig = stages.find((s: any) => s.name === 'QUALIFICATION' || s.name === 'WILDCARD');
  const playoffConfig = stages.find((s: any) => s.name === 'PLAYOFFS');
  const finalConfig = stages.find((s: any) => s.name === 'FINAL');

  const ballsPerOver = groupConfig?.ballsPerOver || (matches[0] as any)?.ballsPerOver || 4;
  const qualificationOvers = qualConfig?.oversPerInnings || 5;
  const playoffOvers = playoffConfig?.oversPerInnings || 6;
  const finalOvers = finalConfig?.oversPerInnings || 6;

  const baseDate = new Date();
  const venue = 'Ratmalana CGR Ground';

  // -------------------------------------------------------------
  // 1. GROUP STAGE (M1–M8) -> QUALIFICATION (M9 & M10)
  // -------------------------------------------------------------
  const groupMatches = matches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 8)
  );
  const groupStageComplete = groupMatches.length === 8 && groupMatches.every((m: any) => m.status === 'COMPLETED');

  const m9 = matches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'M9' || m.bracketSlot === 'PQ1');
  const m10 = matches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'M10' || m.bracketSlot === 'PQ2');

  if (groupStageComplete && (!m9 || !m10)) {
    const a1 = groups.groupA.standings[0];
    const a2 = groups.groupA.standings[1];
    const a3 = groups.groupA.standings[2];
    const a4 = groups.groupA.standings[3];

    const b1 = groups.groupB.standings[0];
    const b2 = groups.groupB.standings[1];
    const b3 = groups.groupB.standings[2];
    const b4 = groups.groupB.standings[3];

    if (a1 && a2 && a3 && a4 && b1 && b2 && b3 && b4) {
      // M9: Group A 2nd vs Group B 2nd
      if (!m9) {
        await createMatchRecord({
          tournamentId,
          teamAId: a2.teamId,
          teamBId: b2.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 1 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: qualificationOvers,
          ballsPerOver,
          stage: 'QUALIFICATION',
          groupName: null,
          matchNumber: 9,
          bracketSlot: 'M9',
        });
      }

      // M10: Group A 3rd vs Group B 3rd
      if (!m10) {
        await createMatchRecord({
          tournamentId,
          teamAId: a3.teamId,
          teamBId: b3.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 2 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: qualificationOvers,
          ballsPerOver,
          stage: 'QUALIFICATION',
          groupName: null,
          matchNumber: 10,
          bracketSlot: 'M10',
        });
      }

      // Mark qualification statuses
      // Group winners qualify directly for 4-team playoff
      await updateTeamsQualification(tournamentId, [a1.teamId, b1.teamId], 'QUALIFIED');
      // 2nd and 3rd enter qualification matches
      await updateTeamsQualification(tournamentId, [a2.teamId, b2.teamId, a3.teamId, b3.teamId], 'QUALIFICATION');
      // 4th place teams are eliminated
      await updateTeamsQualification(tournamentId, [a4.teamId, b4.teamId], 'ELIMINATED');

      return {
        advanced: true,
        message: 'Group Stage concluded. Playoff Qualification Match 9 (2nd vs 2nd) and Match 10 (3rd vs 3rd) generated.',
        stageTriggered: 'QUALIFICATION',
      };
    }
  }

  // -------------------------------------------------------------
  // 2. QUALIFICATION PROGRESSION -> MATCH 11 (FINAL QUALIFIER)
  // M11 = Match 9 Loser vs Match 10 Winner
  // -------------------------------------------------------------
  const m11 = matches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'M11' || m.bracketSlot === 'PQ3');
  if (m9 && m10 && m9.status === 'COMPLETED' && m10.status === 'COMPLETED' && !m11) {
    const m9WinnerId = m9.winnerTeamId;
    const m9LoserId = m9.winnerTeamId === m9.teamAId ? m9.teamBId : m9.teamAId;
    const m10WinnerId = m10.winnerTeamId;
    const m10LoserId = m10.winnerTeamId === m10.teamAId ? m10.teamBId : m10.teamAId;

    if (m9LoserId && m10WinnerId) {
      // Match 9 Winner directly qualifies for the 4-team playoff (Seed 3)
      if (m9WinnerId) {
        await updateTeamsQualification(tournamentId, [m9WinnerId], 'QUALIFIED');
      }

      // Match 10 Loser is eliminated
      if (m10LoserId) {
        await updateTeamsQualification(tournamentId, [m10LoserId], 'ELIMINATED');
      }

      // Create Match 11: Match 9 Loser vs Match 10 Winner
      await createMatchRecord({
        tournamentId,
        teamAId: m9LoserId,
        teamBId: m10WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 3 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: qualificationOvers,
        ballsPerOver,
        stage: 'QUALIFICATION',
        groupName: null,
        matchNumber: 11,
        bracketSlot: 'M11',
      });

      return {
        advanced: true,
        message: 'Matches 9 & 10 concluded. Final Playoff Qualification Match 11 (M9 Loser vs M10 Winner) generated.',
        stageTriggered: 'QUALIFICATION',
      };
    }
  }

  // -------------------------------------------------------------
  // 3. QUALIFICATION CONCLUDED -> FOUR-TEAM PLAYOFF (MATCHES 12 & 13)
  // M12 = Playoff 1st vs Playoff 2nd
  // M13 = Playoff 3rd vs Playoff 4th
  // -------------------------------------------------------------
  const m12 = matches.find((m: any) => m.matchNumber === 12 || m.bracketSlot === 'M12' || m.bracketSlot === 'P1');
  const m13 = matches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'M13' || m.bracketSlot === 'P2');

  if (m11 && m11.status === 'COMPLETED' && (!m12 || !m13)) {
    const m11WinnerId = m11.winnerTeamId;
    const m11LoserId = m11.winnerTeamId === m11.teamAId ? m11.teamBId : m11.teamAId;

    if (m11LoserId) {
      await updateTeamsQualification(tournamentId, [m11LoserId], 'ELIMINATED');
    }
    if (m11WinnerId) {
      await updateTeamsQualification(tournamentId, [m11WinnerId], 'QUALIFIED');
    }

    const seed1 = playoffs.seeds.find((s) => s.seedNumber === 1)?.team;
    const seed2 = playoffs.seeds.find((s) => s.seedNumber === 2)?.team;
    const seed3 = playoffs.seeds.find((s) => s.seedNumber === 3)?.team;
    const seed4 = playoffs.seeds.find((s) => s.seedNumber === 4)?.team || (m11WinnerId ? { id: m11WinnerId } : null);

    if (seed1 && seed2 && seed3 && seed4) {
      // Match 12: Playoff 1st vs Playoff 2nd (Winner -> Final, Loser -> M14)
      if (!m12) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed1.id,
          teamBId: seed2.id,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 4 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 12,
          bracketSlot: 'M12',
        });
      }

      // Match 13: Playoff 3rd vs Playoff 4th (Winner -> M14, Loser -> Eliminated)
      if (!m13) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed3.id,
          teamBId: seed4.id,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 5 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 13,
          bracketSlot: 'M13',
        });
      }

      return {
        advanced: true,
        message: 'Qualification phase concluded. Four-Team Playoff fixtures generated (Match 12: 1st vs 2nd, Match 13: 3rd vs 4th).',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // -------------------------------------------------------------
  // 4. PLAYOFF PROGRESSION -> MATCH 14 (FINAL QUALIFICATION)
  // M14 = Match 12 Loser vs Match 13 Winner
  // -------------------------------------------------------------
  const m14 = matches.find((m: any) => m.matchNumber === 14 || m.bracketSlot === 'M14' || m.bracketSlot === 'P3');
  if (m12 && m13 && m12.status === 'COMPLETED' && m13.status === 'COMPLETED' && !m14) {
    const m12LoserId = m12.winnerTeamId === m12.teamAId ? m12.teamBId : m12.teamAId;
    const m13WinnerId = m13.winnerTeamId;
    const m13LoserId = m13.winnerTeamId === m13.teamAId ? m13.teamBId : m13.teamAId;

    if (m13LoserId) {
      await updateTeamsQualification(tournamentId, [m13LoserId], 'ELIMINATED');
    }

    if (m12LoserId && m13WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: m12LoserId,
        teamBId: m13WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 6 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: playoffOvers,
        ballsPerOver,
        stage: 'PLAYOFFS',
        groupName: null,
        matchNumber: 14,
        bracketSlot: 'M14',
      });

      return {
        advanced: true,
        message: 'Matches 12 & 13 concluded. Match 14 (M12 Loser vs M13 Winner) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // -------------------------------------------------------------
  // 5. PLAYOFF -> GRAND FINAL (MATCH 15)
  // M15 = Match 12 Winner vs Match 14 Winner
  // -------------------------------------------------------------
  const finalMatch = matches.find((m: any) => m.matchNumber === 15 || m.bracketSlot === 'M15' || m.bracketSlot === 'FINAL');
  if (m12 && m14 && m12.status === 'COMPLETED' && m14.status === 'COMPLETED' && !finalMatch) {
    const m12WinnerId = m12.winnerTeamId;
    const m14WinnerId = m14.winnerTeamId;
    const m14LoserId = m14.winnerTeamId === m14.teamAId ? m14.teamBId : m14.teamAId;

    if (m14LoserId) {
      await updateTeamsQualification(tournamentId, [m14LoserId], 'ELIMINATED');
    }

    if (m12WinnerId && m14WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: m12WinnerId,
        teamBId: m14WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 7 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: finalOvers,
        ballsPerOver,
        stage: 'FINAL',
        groupName: null,
        matchNumber: 15,
        bracketSlot: 'M15',
      });

      return {
        advanced: true,
        message: 'Match 14 concluded. Grand Final Match 15 (M12 Winner vs M14 Winner) generated!',
        stageTriggered: 'FINAL',
      };
    }
  }

  // -------------------------------------------------------------
  // 6. GRAND FINAL COMPLETED -> CROWN CHAMPION
  // -------------------------------------------------------------
  if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerTeamId) {
    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });

    await updateTeamsQualification(tournamentId, [finalMatch.winnerTeamId], 'CHAMPION');

    const runnerUpId =
      finalMatch.winnerTeamId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId;
    if (runnerUpId) {
      await updateTeamsQualification(tournamentId, [runnerUpId], 'RUNNER_UP');
    }

    return {
      advanced: true,
      message: 'CPL Grand Final concluded! Champions crowned.',
      stageTriggered: 'COMPLETED',
    };
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
