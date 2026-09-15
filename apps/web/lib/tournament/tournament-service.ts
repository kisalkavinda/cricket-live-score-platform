import { prisma } from 'database';
import {
  computeStageStandings,
  type TeamStanding,
  type MatchData,
} from './nrr-engine';
import { getInningsWicketLimit } from '../scoring/scoring-rules';
import { normalizeImageUrl } from '../utils/image-utils';
import {
  TournamentFormatType,
  TOURNAMENT_FORMAT_CONFIGS,
  resolveTournamentFormat,
  getFormatConfig,
} from './tournament-formats';

export interface TournamentOverview {
  tournament: {
    id: string;
    name: string;
    season: string;
    format: string;
    tournamentFormat: string;
    normalizedFormat: TournamentFormatType;
    status: string;
  };
  tournamentFormat?: string;
  normalizedFormat?: TournamentFormatType;
  crownedChampion?: any | null;
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
  wildcard?: {
    matches: any[];
    wc1: any | null; // M7: A2 vs B2
    wc2: any | null; // M8: B3 vs A3
    wc3: any | null; // M9: WC1 Loser vs WC2 Winner
    wc1Winner: any | null; // Playoff Seed 3
    wc2Winner: any | null;
    wc3Winner: any | null; // Playoff Seed 4
    qualifier1: any | null; // Playoff Seed 3
    qualifier2: any | null; // Playoff Seed 4
  };
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
    playoff1: any | null; // P1 (Top Seed Playoff)
    playoff2: any | null; // P2 (Third vs Fourth Seed)
    finalSpotPlayoff: any | null; // P3 (Final Spot Playoff)
    final: any | null;   // Grand Final
    champion: any | null;
    runnerUp: any | null;
    // Backwards-compatibility aliases for UI subcomponents
    match12?: any | null;
    match13?: any | null;
    match14?: any | null;
    qualifier1?: any | null;
    eliminator?: any | null;
    qualifier2?: any | null;
  };
  matches: any[];
  progress: {
    totalMatches: number;
    completedMatches: number;
    currentStage: 'GROUP' | 'WILDCARD' | 'QUALIFICATION' | 'PLAYOFFS' | 'FINAL' | 'COMPLETED';
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
  const valid = teamIds.filter(Boolean);
  if (valid.length === 0) return;
  await (prisma as any).tournamentTeam.updateMany({
    where: {
      tournamentId,
      teamId: { in: valid },
    },
    data: {
      qualificationStatus: status,
    },
  });
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
 * Retrieves the comprehensive, format-aware tournament overview.
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

  const normalizedFormat = resolveTournamentFormat(tournament);
  const formatConfig = getFormatConfig(tournament);

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
        innings: true,
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
    stage: m.stage || 'GROUP',
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

  // Group Matches based on active format
  const groupStageMatches = rawMatches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= formatConfig.totalGroupMatches)
  );

  const groupAMatches = groupStageMatches.filter(
    (m: any) => isGroupA(m.groupName) || (m.bracketSlot && m.bracketSlot.startsWith('G') && formatConfig.groupFixtures.find((gf) => gf.num === m.matchNumber)?.group === 'GROUP_A')
  );
  const groupBMatches = groupStageMatches.filter(
    (m: any) => isGroupB(m.groupName) || (m.bracketSlot && m.bracketSlot.startsWith('G') && formatConfig.groupFixtures.find((gf) => gf.num === m.matchNumber)?.group === 'GROUP_B')
  );

  // Group Teams with resilient inference
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

  const expectedA = formatConfig.groupSizes.GROUP_A;
  const groupATeams = teams.filter((t: any, idx: number) => {
    if (isGroupA(t.groupName)) return true;
    if (groupATeamIds.has(t.id)) return true;
    if (!t.groupName && !isGroupB(t.groupName) && !groupBTeamIds.has(t.id) && groupATeamIds.size === 0 && idx < expectedA) return true;
    return false;
  });

  const groupBTeams = teams.filter((t: any, idx: number) => {
    if (isGroupB(t.groupName)) return true;
    if (groupBTeamIds.has(t.id)) return true;
    if (!t.groupName && !isGroupA(t.groupName) && !groupATeamIds.has(t.id) && groupBTeamIds.size === 0 && idx >= expectedA) return true;
    return false;
  });

  // 3. Compute Group Stage Standings
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

  const expectedAMatchesCount = normalizedFormat === '6_TEAM' ? 3 : normalizedFormat === '7_TEAM' ? 4 : 6;
  const expectedBMatchesCount = normalizedFormat === '6_TEAM' || normalizedFormat === '7_TEAM' ? 3 : 6;

  const groupAComplete = groupAMatches.length === expectedAMatchesCount && groupAMatches.every((m: any) => m.status === 'COMPLETED');
  const groupBComplete = groupBMatches.length === expectedBMatchesCount && groupBMatches.every((m: any) => m.status === 'COMPLETED');
  const groupStageComplete =
    groupStageMatches.length === formatConfig.totalGroupMatches &&
    groupStageMatches.every((m: any) => m.status === 'COMPLETED');

  // Format-Specific Stage 2 & Playoff Resolution
  let wildcardObj: TournamentOverview['wildcard'] = undefined;
  let qualificationObj: TournamentOverview['qualification'] = {
    matches: [],
    match9: null,
    match10: null,
    match11: null,
    qualifier1: null,
    qualifier2: null,
  };

  let playoff1Match: any = null;
  let playoff2Match: any = null;
  let finalSpotPlayoffMatch: any = null;
  let grandFinalMatch: any = null;
  let playoffSeeds: Array<{ seedNumber: number; team: any | null; label: string }> = [];

  if (normalizedFormat === '6_TEAM') {
    // 6-Team: WC1 (M7), WC2 (M8), WC3 (M9), P1 (M10), P2 (M11), P3 (M12), Final (M13)
    const wc1 = rawMatches.find((m: any) => m.matchNumber === 7 || m.bracketSlot === 'WC1') || null;
    const wc2 = rawMatches.find((m: any) => m.matchNumber === 8 || m.bracketSlot === 'WC2') || null;
    const wc3 = rawMatches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'WC3') || null;

    const wc1Winner = wc1?.status === 'COMPLETED' && wc1.winnerTeamId ? teams.find((t: any) => t.id === wc1.winnerTeamId) || null : null;
    const wc2Winner = wc2?.status === 'COMPLETED' && wc2.winnerTeamId ? teams.find((t: any) => t.id === wc2.winnerTeamId) || null : null;
    const wc3Winner = wc3?.status === 'COMPLETED' && wc3.winnerTeamId ? teams.find((t: any) => t.id === wc3.winnerTeamId) || null : null;

    wildcardObj = {
      matches: [wc1, wc2, wc3].filter(Boolean),
      wc1,
      wc2,
      wc3,
      wc1Winner,
      wc2Winner,
      wc3Winner,
      qualifier1: wc1Winner, // Playoff Seed 3
      qualifier2: wc3Winner, // Playoff Seed 4
    };

    // Alias for qualification backwards compatibility
    qualificationObj = {
      matches: [wc1, wc2, wc3].filter(Boolean),
      match9: wc1,
      match10: wc2,
      match11: wc3,
      qualifier1: wc1Winner,
      qualifier2: wc3Winner,
    };

    playoff1Match = rawMatches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'P1') || null;
    playoff2Match = rawMatches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'P2') || null;
    finalSpotPlayoffMatch = rawMatches.find((m: any) => m.matchNumber === 12 || m.bracketSlot === 'P3') || null;
    grandFinalMatch = rawMatches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'FINAL') || null;

    const a1Team = groupAStandings[0] ? teams.find((t: any) => t.id === groupAStandings[0].teamId) : null;
    const b1Team = groupBStandings[0] ? teams.find((t: any) => t.id === groupBStandings[0].teamId) : null;

    playoffSeeds = [
      { seedNumber: 1, team: a1Team, label: 'Group A Winner' },
      { seedNumber: 2, team: b1Team, label: 'Group B Winner' },
      { seedNumber: 3, team: wc1Winner, label: 'WC1 Winner (Seed 3)' },
      { seedNumber: 4, team: wc3Winner, label: 'WC3 Winner (Seed 4)' },
    ];
  } else if (normalizedFormat === '7_TEAM') {
    // 7-Team: P1 (M8), P2 (M9), P3 (M10), Final (M11)
    playoff1Match = rawMatches.find((m: any) => m.matchNumber === 8 || m.bracketSlot === 'P1') || null;
    playoff2Match = rawMatches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'P2') || null;
    finalSpotPlayoffMatch = rawMatches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'P3') || null;
    grandFinalMatch = rawMatches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'FINAL') || null;

    const a1Team = groupAStandings[0] ? teams.find((t: any) => t.id === groupAStandings[0].teamId) : null;
    const b1Team = groupBStandings[0] ? teams.find((t: any) => t.id === groupBStandings[0].teamId) : null;
    const a2Team = groupAStandings[1] ? teams.find((t: any) => t.id === groupAStandings[1].teamId) : null;
    const b2Team = groupBStandings[1] ? teams.find((t: any) => t.id === groupBStandings[1].teamId) : null;

    playoffSeeds = [
      { seedNumber: 1, team: a1Team, label: 'Group A 1st' },
      { seedNumber: 2, team: b1Team, label: 'Group B 1st' },
      { seedNumber: 3, team: a2Team, label: 'Group A 2nd' },
      { seedNumber: 4, team: b2Team, label: 'Group B 2nd' },
    ];
  } else {
    // 8-Team: 12 Group Matches -> Global Playoff Seeding -> P1 (M13), P2 (M14), P3 (M15), Grand Final (M16)
    playoff1Match = rawMatches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'P1') || null;
    playoff2Match = rawMatches.find((m: any) => m.matchNumber === 14 || m.bracketSlot === 'P2') || null;
    finalSpotPlayoffMatch = rawMatches.find((m: any) => m.matchNumber === 15 || m.bracketSlot === 'P3') || null;
    grandFinalMatch = rawMatches.find((m: any) => m.matchNumber === 16 || m.bracketSlot === 'FINAL') || null;

    let seed1Team: any = null;
    let seed2Team: any = null;
    let seed3Team: any = null;
    let seed4Team: any = null;

    if (groupStageComplete && groupAStandings.length >= 2 && groupBStandings.length >= 2) {
      // 4 qualified teams: top 2 from Group A and top 2 from Group B
      const qualified = [
        groupAStandings[0],
        groupAStandings[1],
        groupBStandings[0],
        groupBStandings[1],
      ].filter(Boolean);

      // Global ranking: 1. Points DESC, 2. Net Run Rate DESC
      // If two teams from the same group have identical points & NRR, check head-to-head match
      qualified.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        if (Math.abs(y.nrr - x.nrr) > 0.000001) return y.nrr - x.nrr;
        if (x.groupName && y.groupName && x.groupName === y.groupName) {
          const h2h = matches.find(
            (m) =>
              (m.teamAId === x.teamId && m.teamBId === y.teamId) ||
              (m.teamAId === y.teamId && m.teamBId === x.teamId)
          );
          if (h2h && h2h.winnerTeamId === x.teamId) return -1;
          if (h2h && h2h.winnerTeamId === y.teamId) return 1;
        }
        return 0;
      });

      seed1Team = qualified[0] ? teams.find((t: any) => t.id === qualified[0].teamId) || null : null;
      seed2Team = qualified[1] ? teams.find((t: any) => t.id === qualified[1].teamId) || null : null;
      seed3Team = qualified[2] ? teams.find((t: any) => t.id === qualified[2].teamId) || null : null;
      seed4Team = qualified[3] ? teams.find((t: any) => t.id === qualified[3].teamId) || null : null;
    }

    playoffSeeds = [
      { seedNumber: 1, team: seed1Team, label: 'Playoff Seed 1' },
      { seedNumber: 2, team: seed2Team, label: 'Playoff Seed 2' },
      { seedNumber: 3, team: seed3Team, label: 'Playoff Seed 3' },
      { seedNumber: 4, team: seed4Team, label: 'Playoff Seed 4' },
    ];
  }

  const championTeam =
    grandFinalMatch && grandFinalMatch.status === 'COMPLETED' && grandFinalMatch.winnerTeam
      ? grandFinalMatch.winnerTeam
      : null;

  const runnerUpTeam =
    grandFinalMatch && grandFinalMatch.status === 'COMPLETED' && grandFinalMatch.winnerTeamId
      ? grandFinalMatch.winnerTeamId === grandFinalMatch.teamAId
        ? grandFinalMatch.teamB
        : grandFinalMatch.teamA
      : null;

  // Progression stage determination
  const completedCount = rawMatches.filter((m: any) => m.status === 'COMPLETED').length;
  let currentStage: TournamentOverview['progress']['currentStage'] = 'GROUP';

  if (grandFinalMatch && grandFinalMatch.status === 'COMPLETED') {
    currentStage = 'COMPLETED';
  } else if (
    grandFinalMatch &&
    (grandFinalMatch.status === 'LIVE' || (playoff1Match?.status === 'COMPLETED' && finalSpotPlayoffMatch?.status === 'COMPLETED'))
  ) {
    currentStage = 'FINAL';
  } else if (
    normalizedFormat === '6_TEAM' &&
    ((wildcardObj?.wc3 && wildcardObj.wc3.status === 'COMPLETED') ||
      playoff1Match?.status === 'LIVE' ||
      playoff1Match?.status === 'COMPLETED' ||
      playoff2Match?.status === 'LIVE' ||
      playoff2Match?.status === 'COMPLETED')
  ) {
    currentStage = 'PLAYOFFS';
  } else if (
    normalizedFormat === '6_TEAM' &&
    (groupStageComplete || (wildcardObj?.matches || []).some((m) => m?.status === 'LIVE' || m?.status === 'COMPLETED'))
  ) {
    currentStage = 'WILDCARD';
  } else if (
    normalizedFormat === '7_TEAM' &&
    (groupStageComplete || playoff1Match?.status === 'LIVE' || playoff1Match?.status === 'COMPLETED' || playoff2Match?.status === 'LIVE' || playoff2Match?.status === 'COMPLETED')
  ) {
    currentStage = 'PLAYOFFS';
  } else if (
    normalizedFormat === '8_TEAM' &&
    (groupStageComplete || playoff1Match?.status === 'LIVE' || playoff1Match?.status === 'COMPLETED' || playoff2Match?.status === 'LIVE' || playoff2Match?.status === 'COMPLETED')
  ) {
    currentStage = 'PLAYOFFS';
  } else {
    currentStage = 'GROUP';
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      season: tournament.season,
      format: tournament.format,
      tournamentFormat: tournament.tournamentFormat || '8_TEAM',
      normalizedFormat,
      status: tournament.status,
    },
    tournamentFormat: tournament.tournamentFormat || '8_TEAM',
    normalizedFormat,
    crownedChampion: championTeam,
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
    wildcard: wildcardObj,
    qualification: qualificationObj,
    playoffs: {
      seeds: playoffSeeds,
      playoff1: playoff1Match,
      playoff2: playoff2Match,
      finalSpotPlayoff: finalSpotPlayoffMatch,
      final: grandFinalMatch,
      champion: championTeam,
      runnerUp: runnerUpTeam,
      // Backward-compatibility aliases
      match12: playoff1Match,
      match13: playoff2Match,
      match14: finalSpotPlayoffMatch,
      qualifier1: playoff1Match,
      eliminator: playoff2Match,
      qualifier2: finalSpotPlayoffMatch,
    },
    matches: rawMatches,
    progress: {
      totalMatches: formatConfig.totalMatches,
      completedMatches: completedCount,
      currentStage,
    },
  };
}

/**
 * Assigns teams into Group A and Group B according to the selected tournament format.
 * 6-Team: exactly 3 in Group A, 3 in Group B.
 * 7-Team: exactly 4 in Group A, 3 in Group B.
 * 8-Team: exactly 4 in Group A, 4 in Group B.
 */
export async function assignTeamsToGroups(
  tournamentId: string,
  assignments: Record<string, 'GROUP_A' | 'GROUP_B' | { group: 'GROUP_A' | 'GROUP_B'; position?: number }>,
  positions?: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const tournament = await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    const formatConfig = getFormatConfig(tournament);
    const expectedA = formatConfig.groupSizes.GROUP_A;
    const expectedB = formatConfig.groupSizes.GROUP_B;

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

    if (assignedGroupA.length !== expectedA || assignedGroupB.length !== expectedB) {
      return {
        success: false,
        error: `${formatConfig.displayName} requires exactly ${expectedA} teams in Group A and ${expectedB} teams in Group B. Currently: Group A (${assignedGroupA.length}/${expectedA}), Group B (${assignedGroupB.length}/${expectedB}).`,
      };
    }

    const assignedTeamIds = [...assignedGroupA, ...assignedGroupB];

    // 1. Clear group and seed for any unassigned teams in this tournament
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

    // 2. Upsert the assigned teams with their group and seed
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
 * Unassigns all teams from groups. Allowed only when no matches/fixtures exist.
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
 * Updates the tournament format configuration (6_TEAM, 7_TEAM, 8_TEAM).
 * Permitted only when no fixtures have been generated.
 */
export async function updateTournamentFormat(
  tournamentId: string,
  newFormat: TournamentFormatType
): Promise<{ success: boolean; error?: string }> {
  try {
    const matchCount = await (prisma as any).match.count({
      where: { tournamentId },
    });
    if (matchCount > 0) {
      return {
        success: false,
        error: 'Cannot change tournament format while fixtures exist. Please reset fixtures first.',
      };
    }

    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: {
        tournamentFormat: newFormat,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('[updateTournamentFormat] error:', err);
    return { success: false, error: err.message || 'Failed to update tournament format.' };
  }
}

/**
 * Configures the stage-specific over limits and balls per over.
 */
export async function configureTournamentStages(
  tournamentId: string,
  settings: {
    ballsPerOver?: number;
    groupOvers?: number;
    qualificationOvers?: number;
    wildcardOvers?: number;
    playoffOvers?: number;
    finalOvers?: number;
  }
): Promise<{ success: boolean; error?: string }> {
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

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  const formatConfig = getFormatConfig(tournament);
  const ballsPerOver = settings.ballsPerOver || 4;

  let stages: Array<{ name: string; stageOrder: number; overs: number; ballsPerOver: number }> = [];

  if (formatConfig.format === '6_TEAM') {
    const wcOvers = settings.wildcardOvers || settings.qualificationOvers || 5;
    stages = [
      { name: 'GROUP', stageOrder: 1, overs: settings.groupOvers || 4, ballsPerOver },
      { name: 'WILDCARD', stageOrder: 2, overs: wcOvers, ballsPerOver },
      { name: 'PLAYOFFS', stageOrder: 3, overs: settings.playoffOvers || 6, ballsPerOver },
      { name: 'FINAL', stageOrder: 4, overs: settings.finalOvers || 6, ballsPerOver },
    ];
  } else {
    // 7_TEAM and 8_TEAM have strictly 3 stages: GROUP, PLAYOFFS, FINAL
    stages = [
      { name: 'GROUP', stageOrder: 1, overs: settings.groupOvers || 4, ballsPerOver },
      { name: 'PLAYOFFS', stageOrder: 2, overs: settings.playoffOvers || 6, ballsPerOver },
      { name: 'FINAL', stageOrder: 3, overs: settings.finalOvers || 6, ballsPerOver },
    ];
  }

  // Delete any stages that do not belong to this format
  const allowedNames = stages.map((s) => s.name);
  await (prisma as any).tournamentStage.deleteMany({
    where: {
      tournamentId,
      name: { notIn: allowedNames },
    },
  });

  const existingStages = await (prisma as any).tournamentStage.findMany({
    where: { tournamentId },
  });
  const existingMap = new Map(existingStages.map((s: any) => [s.name, s]));

  for (const s of stages) {
    const existing = existingMap.get(s.name) as any;
    if (existing) {
      await (prisma as any).tournamentStage.update({
        where: { id: existing.id },
        data: {
          stageOrder: s.stageOrder,
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
 * Resets tournament fixtures, innings, and deliveries, returning the tournament
 * to DRAFT / SCHEDULED state so that format rules or group assignments can be reconfigured.
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

  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'SCHEDULED',
    },
  });

  return { success: true };
}

/**
 * Generates group-stage fixtures dynamically based on the tournament format.
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

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return { success: false, error: 'Tournament not found' };
  }

  const formatConfig = getFormatConfig(tournament);
  const expectedA = formatConfig.groupSizes.GROUP_A;
  const expectedB = formatConfig.groupSizes.GROUP_B;

  const ballsPerOver = settings.ballsPerOver || 4;
  const oversPerInnings = settings.groupOvers || settings.oversPerInnings || 4;
  const qualOvers = settings.qualificationOvers || settings.wildcardOvers || 5;
  const venue = settings.venue || 'Ratmalana CGR Ground';
  const baseDate = settings.startDate ? new Date(settings.startDate) : new Date();

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

  if (groupA.length !== expectedA || groupB.length !== expectedB) {
    return {
      success: false,
      error: `${formatConfig.displayName} requires exactly ${formatConfig.totalTeams} teams (${expectedA} in Group A, ${expectedB} in Group B). Found: Group A (${groupA.length}), Group B (${groupB.length}).`,
    };
  }

  // Check if upcoming group matches already exist
  const allExistingMatches = await (prisma as any).match.findMany({
    where: { tournamentId },
  });
  const existingGroupMatches = allExistingMatches.filter((m: any) => m.matchNumber && m.matchNumber <= formatConfig.totalGroupMatches);

  if (existingGroupMatches.length > 0) {
    const started = existingGroupMatches.some((m: any) => m.status === 'LIVE' || m.status === 'COMPLETED');
    if (started) {
      return { success: false, error: 'Group stage matches have already started and cannot be regenerated.' };
    }
    await (prisma as any).$executeRawUnsafe(
      `DELETE FROM "Match" WHERE "tournamentId" = $1 AND "matchNumber" <= $2 AND "status" = 'UPCOMING'`,
      tournamentId,
      formatConfig.totalGroupMatches
    );
  }

  // Generate fixtures from format config
  for (const f of formatConfig.groupFixtures) {
    const scheduled = new Date(baseDate.getTime() + f.offsetHours * 60 * 60 * 1000);
    const teamAId = f.group === 'GROUP_A' ? groupA[f.teamAIndex].teamId : groupB[f.teamAIndex].teamId;
    const teamBId = f.group === 'GROUP_A' ? groupA[f.teamBIndex].teamId : groupB[f.teamBIndex].teamId;

    await createMatchRecord({
      tournamentId,
      teamAId,
      teamBId,
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

  await (prisma as any).tournament.update({
    where: { id: tournamentId },
    data: { status: 'SCHEDULED' },
  });

  return { success: true, createdCount: formatConfig.totalGroupMatches };
}

/**
 * Evaluates match outcomes and automatically generates the next stage matches.
 * Dispatches to format-specific advancement logic (6-Team, 7-Team, or 8-Team).
 */
export async function checkAndAdvanceTournament(tournamentId: string): Promise<{
  advanced: boolean;
  message: string;
  stageTriggered?: string;
}> {
  const overview = await getTournamentOverview(tournamentId);
  if (!overview) return { advanced: false, message: 'Tournament not found.' };

  const format = overview.tournament.normalizedFormat;

  const stages = await (prisma as any).tournamentStage.findMany({ where: { tournamentId } });
  const groupConfig = stages.find((s: any) => s.name === 'GROUP');
  const qualConfig = stages.find((s: any) => s.name === 'QUALIFICATION' || s.name === 'WILDCARD');
  const playoffConfig = stages.find((s: any) => s.name === 'PLAYOFFS');
  const finalConfig = stages.find((s: any) => s.name === 'FINAL');

  const ballsPerOver = groupConfig?.ballsPerOver || (overview.matches[0] as any)?.ballsPerOver || 4;
  const qualOvers = qualConfig?.oversPerInnings || 5;
  const playoffOvers = playoffConfig?.oversPerInnings || 6;
  const finalOvers = finalConfig?.oversPerInnings || 6;

  const baseDate = new Date();
  const venue = 'Ratmalana CGR Ground';

  if (format === '6_TEAM') {
    return advance6TeamTournament(
      tournamentId,
      overview,
      baseDate,
      venue,
      ballsPerOver,
      qualOvers,
      playoffOvers,
      finalOvers
    );
  } else if (format === '7_TEAM') {
    return advance7TeamTournament(
      tournamentId,
      overview,
      baseDate,
      venue,
      ballsPerOver,
      playoffOvers,
      finalOvers
    );
  } else {
    return advance8TeamTournament(
      tournamentId,
      overview,
      baseDate,
      venue,
      ballsPerOver,
      qualOvers,
      playoffOvers,
      finalOvers
    );
  }
}

/**
 * 6-Team Tournament Progression:
 * Group Stage (M1–M6) -> Wildcard (M7: WC1, M8: WC2, M9: WC3) -> Playoffs (M10: P1, M11: P2, M12: P3) -> Grand Final (M13).
 */
async function advance6TeamTournament(
  tournamentId: string,
  overview: TournamentOverview,
  baseDate: Date,
  venue: string,
  ballsPerOver: number,
  qualOvers: number,
  playoffOvers: number,
  finalOvers: number
): Promise<{ advanced: boolean; message: string; stageTriggered?: string }> {
  const { matches, groups } = overview;
  const groupMatches = matches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 6)
  );
  const groupStageComplete = groupMatches.length === 6 && groupMatches.every((m: any) => m.status === 'COMPLETED');

  const m7 = matches.find((m: any) => m.matchNumber === 7 || m.bracketSlot === 'WC1');
  const m8 = matches.find((m: any) => m.matchNumber === 8 || m.bracketSlot === 'WC2');
  const m9 = matches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'WC3');

  // 1. Group Stage Complete -> Generate WC1 (M7: A2 vs B2) and WC2 (M8: B3 vs A3)
  if (groupStageComplete && (!m7 || !m8)) {
    const a1 = groups.groupA.standings[0];
    const a2 = groups.groupA.standings[1];
    const a3 = groups.groupA.standings[2];

    const b1 = groups.groupB.standings[0];
    const b2 = groups.groupB.standings[1];
    const b3 = groups.groupB.standings[2];

    if (a1 && a2 && a3 && b1 && b2 && b3) {
      if (!m7) {
        await createMatchRecord({
          tournamentId,
          teamAId: a2.teamId,
          teamBId: b2.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 1 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: qualOvers,
          ballsPerOver,
          stage: 'WILDCARD',
          groupName: null,
          matchNumber: 7,
          bracketSlot: 'WC1',
        });
      }

      if (!m8) {
        await createMatchRecord({
          tournamentId,
          teamAId: b3.teamId,
          teamBId: a3.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 2 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: qualOvers,
          ballsPerOver,
          stage: 'WILDCARD',
          groupName: null,
          matchNumber: 8,
          bracketSlot: 'WC2',
        });
      }

      await updateTeamsQualification(tournamentId, [a1.teamId, b1.teamId], 'QUALIFIED');
      await updateTeamsQualification(tournamentId, [a2.teamId, b2.teamId, a3.teamId, b3.teamId], 'WILDCARD');

      return {
        advanced: true,
        message: 'Group Stage completed. Wildcard Match 7 (WC1: A2 vs B2) and Match 8 (WC2: B3 vs A3) generated.',
        stageTriggered: 'WILDCARD',
      };
    }
  }

  // 2. WC1 (M7) & WC2 (M8) Complete -> Generate WC3 (M9: WC1 Loser vs WC2 Winner)
  if (m7 && m8 && m7.status === 'COMPLETED' && m8.status === 'COMPLETED' && !m9) {
    const wc1WinnerId = m7.winnerTeamId;
    const wc1LoserId = m7.winnerTeamId === m7.teamAId ? m7.teamBId : m7.teamAId;
    const wc2WinnerId = m8.winnerTeamId;
    const wc2LoserId = m8.winnerTeamId === m8.teamAId ? m8.teamBId : m8.teamAId;

    if (wc1WinnerId) {
      await updateTeamsQualification(tournamentId, [wc1WinnerId], 'QUALIFIED');
    }
    if (wc2LoserId) {
      await updateTeamsQualification(tournamentId, [wc2LoserId], 'ELIMINATED');
    }

    if (wc1LoserId && wc2WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: wc1LoserId,
        teamBId: wc2WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 3 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: qualOvers,
        ballsPerOver,
        stage: 'WILDCARD',
        groupName: null,
        matchNumber: 9,
        bracketSlot: 'WC3',
      });

      return {
        advanced: true,
        message: 'WC1 and WC2 completed. Wildcard Match 9 (WC3: WC1 Loser vs WC2 Winner) generated.',
        stageTriggered: 'WILDCARD',
      };
    }
  }

  // 3. WC3 (M9) Complete -> Generate P1 (M10: A1 vs B1) and P2 (M11: Seed 3 [WC1 Winner] vs Seed 4 [WC3 Winner])
  const m10 = matches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'P1');
  const m11 = matches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'P2');

  if (m7 && m8 && m9 && m9.status === 'COMPLETED' && (!m10 || !m11)) {
    const wc3WinnerId = m9.winnerTeamId;
    const wc3LoserId = m9.winnerTeamId === m9.teamAId ? m9.teamBId : m9.teamAId;

    if (wc3WinnerId) {
      await updateTeamsQualification(tournamentId, [wc3WinnerId], 'QUALIFIED');
    }
    if (wc3LoserId) {
      await updateTeamsQualification(tournamentId, [wc3LoserId], 'ELIMINATED');
    }

    const a1 = groups.groupA.standings[0];
    const b1 = groups.groupB.standings[0];
    const seed3Id = m7.winnerTeamId; // WC1 Winner
    const seed4Id = wc3WinnerId;    // WC3 Winner

    if (a1 && b1 && seed3Id && seed4Id) {
      if (!m10) {
        await createMatchRecord({
          tournamentId,
          teamAId: a1.teamId,
          teamBId: b1.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 4 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 10,
          bracketSlot: 'P1',
        });
      }

      if (!m11) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed3Id,
          teamBId: seed4Id,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 5 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 11,
          bracketSlot: 'P2',
        });
      }

      return {
        advanced: true,
        message: 'Wildcard stage concluded. Playoff Match 10 (P1: A1 vs B1) and Match 11 (P2: Seed 3 vs Seed 4) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 4. P1 (M10) and P2 (M11) Complete -> Generate P3 (M12: P1 Loser vs P2 Winner)
  const m12 = matches.find((m: any) => m.matchNumber === 12 || m.bracketSlot === 'P3');
  if (m10 && m11 && m10.status === 'COMPLETED' && m11.status === 'COMPLETED' && !m12) {
    const p1LoserId = m10.winnerTeamId === m10.teamAId ? m10.teamBId : m10.teamAId;
    const p2WinnerId = m11.winnerTeamId;
    const p2LoserId = m11.winnerTeamId === m11.teamAId ? m11.teamBId : m11.teamAId;

    if (p2LoserId) {
      await updateTeamsQualification(tournamentId, [p2LoserId], 'ELIMINATED');
    }

    if (p1LoserId && p2WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1LoserId,
        teamBId: p2WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 6 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: playoffOvers,
        ballsPerOver,
        stage: 'PLAYOFFS',
        groupName: null,
        matchNumber: 12,
        bracketSlot: 'P3',
      });

      return {
        advanced: true,
        message: 'Playoff Matches 10 & 11 concluded. Final Spot Playoff Match 12 (P3: P1 Loser vs P2 Winner) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 5. P3 (M12) Complete -> Generate Grand Final (M13: P1 Winner vs P3 Winner)
  const m13 = matches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'FINAL');
  if (m10 && m12 && m10.status === 'COMPLETED' && m12.status === 'COMPLETED' && !m13) {
    const p1WinnerId = m10.winnerTeamId;
    const p3WinnerId = m12.winnerTeamId;
    const p3LoserId = m12.winnerTeamId === m12.teamAId ? m12.teamBId : m12.teamAId;

    if (p3LoserId) {
      await updateTeamsQualification(tournamentId, [p3LoserId], 'ELIMINATED');
    }

    if (p1WinnerId && p3WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1WinnerId,
        teamBId: p3WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 7 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: finalOvers,
        ballsPerOver,
        stage: 'FINAL',
        groupName: null,
        matchNumber: 13,
        bracketSlot: 'FINAL',
      });

      return {
        advanced: true,
        message: 'Match 12 concluded. Grand Final Match 13 (P1 Winner vs P3 Winner) generated!',
        stageTriggered: 'FINAL',
      };
    }
  }

  // 6. Grand Final (M13) Complete -> Crown Champion
  if (m13 && m13.status === 'COMPLETED' && m13.winnerTeamId) {
    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });
    await updateTeamsQualification(tournamentId, [m13.winnerTeamId], 'CHAMPION');
    const runnerUpId = m13.winnerTeamId === m13.teamAId ? m13.teamBId : m13.teamAId;
    if (runnerUpId) {
      await updateTeamsQualification(tournamentId, [runnerUpId], 'RUNNER_UP');
    }

    return {
      advanced: true,
      message: 'CPL 6-Team Grand Final concluded! Champion crowned.',
      stageTriggered: 'COMPLETED',
    };
  }

  return { advanced: false, message: 'No advancement triggers active at this time.' };
}

/**
 * 7-Team Tournament Progression:
 * Group Stage (M1–M7) -> 3-Match Playoffs (M8: P1, M9: P2, M10: P3) -> Grand Final (M11).
 */
async function advance7TeamTournament(
  tournamentId: string,
  overview: TournamentOverview,
  baseDate: Date,
  venue: string,
  ballsPerOver: number,
  playoffOvers: number,
  finalOvers: number
): Promise<{ advanced: boolean; message: string; stageTriggered?: string }> {
  const { matches, groups } = overview;
  const groupMatches = matches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 7)
  );
  const groupStageComplete = groupMatches.length === 7 && groupMatches.every((m: any) => m.status === 'COMPLETED');

  const m8 = matches.find((m: any) => m.matchNumber === 8 || m.bracketSlot === 'P1');
  const m9 = matches.find((m: any) => m.matchNumber === 9 || m.bracketSlot === 'P2');

  // 1. Group Stage Complete -> Generate P1 (M8: A1 vs B1) and P2 (M9: A2 vs B2)
  if (groupStageComplete && (!m8 || !m9)) {
    const a1 = groups.groupA.standings[0];
    const a2 = groups.groupA.standings[1];
    const a3 = groups.groupA.standings[2];
    const a4 = groups.groupA.standings[3];

    const b1 = groups.groupB.standings[0];
    const b2 = groups.groupB.standings[1];
    const b3 = groups.groupB.standings[2];

    if (a1 && a2 && b1 && b2) {
      // Lower ranked teams eliminated
      const eliminated = [a3?.teamId, a4?.teamId, b3?.teamId].filter(Boolean) as string[];
      if (eliminated.length > 0) {
        await updateTeamsQualification(tournamentId, eliminated, 'ELIMINATED');
      }

      await updateTeamsQualification(tournamentId, [a1.teamId, b1.teamId, a2.teamId, b2.teamId], 'QUALIFIED');

      if (!m8) {
        await createMatchRecord({
          tournamentId,
          teamAId: a1.teamId,
          teamBId: b1.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 1 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 8,
          bracketSlot: 'P1',
        });
      }

      if (!m9) {
        await createMatchRecord({
          tournamentId,
          teamAId: a2.teamId,
          teamBId: b2.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 2 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 9,
          bracketSlot: 'P2',
        });
      }

      return {
        advanced: true,
        message: 'Group Stage completed. Playoff Match 8 (P1: A1 vs B1) and Match 9 (P2: A2 vs B2) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 2. P1 (M8) & P2 (M9) Complete -> Generate P3 (M10: P1 Loser vs P2 Winner)
  const m10 = matches.find((m: any) => m.matchNumber === 10 || m.bracketSlot === 'P3');
  if (m8 && m9 && m8.status === 'COMPLETED' && m9.status === 'COMPLETED' && !m10) {
    const p1LoserId = m8.winnerTeamId === m8.teamAId ? m8.teamBId : m8.teamAId;
    const p2WinnerId = m9.winnerTeamId;
    const p2LoserId = m9.winnerTeamId === m9.teamAId ? m9.teamBId : m9.teamAId;

    if (p2LoserId) {
      await updateTeamsQualification(tournamentId, [p2LoserId], 'ELIMINATED');
    }

    if (p1LoserId && p2WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1LoserId,
        teamBId: p2WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 3 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: playoffOvers,
        ballsPerOver,
        stage: 'PLAYOFFS',
        groupName: null,
        matchNumber: 10,
        bracketSlot: 'P3',
      });

      return {
        advanced: true,
        message: 'Matches 8 & 9 concluded. Final Spot Playoff Match 10 (P3: P1 Loser vs P2 Winner) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 3. P3 (M10) Complete -> Generate Grand Final (M11: P1 Winner vs P3 Winner)
  const m11 = matches.find((m: any) => m.matchNumber === 11 || m.bracketSlot === 'FINAL');
  if (m8 && m10 && m8.status === 'COMPLETED' && m10.status === 'COMPLETED' && !m11) {
    const p1WinnerId = m8.winnerTeamId;
    const p3WinnerId = m10.winnerTeamId;
    const p3LoserId = m10.winnerTeamId === m10.teamAId ? m10.teamBId : m10.teamAId;

    if (p3LoserId) {
      await updateTeamsQualification(tournamentId, [p3LoserId], 'ELIMINATED');
    }

    if (p1WinnerId && p3WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1WinnerId,
        teamBId: p3WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 4 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: finalOvers,
        ballsPerOver,
        stage: 'FINAL',
        groupName: null,
        matchNumber: 11,
        bracketSlot: 'FINAL',
      });

      return {
        advanced: true,
        message: 'Match 10 concluded. Grand Final Match 11 (P1 Winner vs P3 Winner) generated!',
        stageTriggered: 'FINAL',
      };
    }
  }

  // 4. Grand Final (M11) Complete -> Crown Champion
  if (m11 && m11.status === 'COMPLETED' && m11.winnerTeamId) {
    await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });
    await updateTeamsQualification(tournamentId, [m11.winnerTeamId], 'CHAMPION');
    const runnerUpId = m11.winnerTeamId === m11.teamAId ? m11.teamBId : m11.teamAId;
    if (runnerUpId) {
      await updateTeamsQualification(tournamentId, [runnerUpId], 'RUNNER_UP');
    }

    return {
      advanced: true,
      message: 'CPL 7-Team Grand Final concluded! Champion crowned.',
      stageTriggered: 'COMPLETED',
    };
  }

  return { advanced: false, message: 'No advancement triggers active at this time.' };
}

/**
 * 8-Team Tournament Progression (Full Round-Robin 16-Match Format):
 * Group Stage (M1–M12) -> Global Playoff Seeding (Seeds 1–4) -> 3-Match Playoffs (M13: P1, M14: P2, M15: P3) -> Grand Final (M16).
 */
async function advance8TeamTournament(
  tournamentId: string,
  overview: TournamentOverview,
  baseDate: Date,
  venue: string,
  ballsPerOver: number,
  qualOvers: number,
  playoffOvers: number,
  finalOvers: number
): Promise<{ advanced: boolean; message: string; stageTriggered?: string }> {
  const { matches, groups } = overview;

  // 1. GROUP STAGE (M1–M12) -> PLAYOFF SEMIS (M13: P1 & M14: P2)
  const groupMatches = matches.filter(
    (m: any) => m.stage === 'GROUP' || (m.matchNumber && m.matchNumber <= 12)
  );
  const groupStageComplete = groupMatches.length === 12 && groupMatches.every((m: any) => m.status === 'COMPLETED');

  const m13 = matches.find((m: any) => m.matchNumber === 13 || m.bracketSlot === 'P1');
  const m14 = matches.find((m: any) => m.matchNumber === 14 || m.bracketSlot === 'P2');

  if (groupStageComplete && (!m13 || !m14)) {
    const a1 = groups.groupA.standings[0];
    const a2 = groups.groupA.standings[1];
    const a3 = groups.groupA.standings[2];
    const a4 = groups.groupA.standings[3];

    const b1 = groups.groupB.standings[0];
    const b2 = groups.groupB.standings[1];
    const b3 = groups.groupB.standings[2];
    const b4 = groups.groupB.standings[3];

    if (a1 && a2 && b1 && b2) {
      // Bottom two teams from each group are eliminated
      const eliminatedIds = [a3?.teamId, a4?.teamId, b3?.teamId, b4?.teamId].filter(Boolean) as string[];
      if (eliminatedIds.length > 0) {
        await updateTeamsQualification(tournamentId, eliminatedIds, 'ELIMINATED');
      }

      // 4 qualified teams: top 2 from Group A and top 2 from Group B
      const qualified = [a1, a2, b1, b2];

      // Global seeding ranking: 1. Points DESC, 2. Net Run Rate DESC
      // If two teams from the same group have identical points & NRR, check head-to-head match
      qualified.sort((x, y) => {
        if (y.points !== x.points) return y.points - x.points;
        if (Math.abs(y.nrr - x.nrr) > 0.000001) return y.nrr - x.nrr;
        if (x.groupName && y.groupName && x.groupName === y.groupName) {
          const h2h = matches.find(
            (m) =>
              (m.teamAId === x.teamId && m.teamBId === y.teamId) ||
              (m.teamAId === y.teamId && m.teamBId === x.teamId)
          );
          if (h2h && h2h.winnerTeamId === x.teamId) return -1;
          if (h2h && h2h.winnerTeamId === y.teamId) return 1;
        }
        return 0;
      });

      const seed1 = qualified[0];
      const seed2 = qualified[1];
      const seed3 = qualified[2];
      const seed4 = qualified[3];

      await updateTeamsQualification(tournamentId, [seed1.teamId, seed2.teamId, seed3.teamId, seed4.teamId], 'QUALIFIED');

      if (!m13) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed1.teamId,
          teamBId: seed2.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 1 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 13,
          bracketSlot: 'P1',
        });
      }

      if (!m14) {
        await createMatchRecord({
          tournamentId,
          teamAId: seed3.teamId,
          teamBId: seed4.teamId,
          venue,
          scheduledAt: new Date(baseDate.getTime() + 2 * 3600000),
          status: 'UPCOMING',
          oversPerInnings: playoffOvers,
          ballsPerOver,
          stage: 'PLAYOFFS',
          groupName: null,
          matchNumber: 14,
          bracketSlot: 'P2',
        });
      }

      return {
        advanced: true,
        message: 'Group Stage completed. Playoff Match 13 (P1: Seed 1 vs Seed 2) and Match 14 (P2: Seed 3 vs Seed 4) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 2. P1 (M13) & P2 (M14) Complete -> Generate P3 (M15: P1 Loser vs P2 Winner)
  const m15 = matches.find((m: any) => m.matchNumber === 15 || m.bracketSlot === 'P3');
  if (m13 && m14 && m13.status === 'COMPLETED' && m14.status === 'COMPLETED' && !m15) {
    const p1LoserId = m13.winnerTeamId === m13.teamAId ? m13.teamBId : m13.teamAId;
    const p2WinnerId = m14.winnerTeamId;
    const p2LoserId = m14.winnerTeamId === m14.teamAId ? m14.teamBId : m14.teamAId;

    if (p2LoserId) {
      await updateTeamsQualification(tournamentId, [p2LoserId], 'ELIMINATED');
    }

    if (p1LoserId && p2WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1LoserId,
        teamBId: p2WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 3 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: playoffOvers,
        ballsPerOver,
        stage: 'PLAYOFFS',
        groupName: null,
        matchNumber: 15,
        bracketSlot: 'P3',
      });

      return {
        advanced: true,
        message: 'Playoff Matches 13 & 14 concluded. Final Spot Playoff Match 15 (P3: P1 Loser vs P2 Winner) generated.',
        stageTriggered: 'PLAYOFFS',
      };
    }
  }

  // 3. P3 (M15) Complete -> Generate Grand Final (M16: P1 Winner vs P3 Winner)
  const finalMatch = matches.find((m: any) => m.matchNumber === 16 || m.bracketSlot === 'FINAL');
  if (m13 && m15 && m13.status === 'COMPLETED' && m15.status === 'COMPLETED' && !finalMatch) {
    const p1WinnerId = m13.winnerTeamId;
    const p3WinnerId = m15.winnerTeamId;
    const p3LoserId = m15.winnerTeamId === m15.teamAId ? m15.teamBId : m15.teamAId;

    if (p3LoserId) {
      await updateTeamsQualification(tournamentId, [p3LoserId], 'ELIMINATED');
    }

    if (p1WinnerId && p3WinnerId) {
      await createMatchRecord({
        tournamentId,
        teamAId: p1WinnerId,
        teamBId: p3WinnerId,
        venue,
        scheduledAt: new Date(baseDate.getTime() + 4 * 3600000),
        status: 'UPCOMING',
        oversPerInnings: finalOvers,
        ballsPerOver,
        stage: 'FINAL',
        groupName: null,
        matchNumber: 16,
        bracketSlot: 'FINAL',
      });

      return {
        advanced: true,
        message: 'Match 15 concluded. Grand Final Match 16 (P1 Winner vs P3 Winner) generated!',
        stageTriggered: 'FINAL',
      };
    }
  }

  // 4. Grand Final (M16) Complete -> Crown Champion
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
      message: 'CPL 8-Team Grand Final concluded! Champion crowned.',
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

  const allStandings = [
    ...(overview.groups.groupA?.standings || []),
    ...(overview.groups.groupB?.standings || []),
  ];

  await Promise.all(
    allStandings.map((s) =>
      (prisma as any).$executeRawUnsafe(
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
      )
    )
  );

  return { success: true };
}
