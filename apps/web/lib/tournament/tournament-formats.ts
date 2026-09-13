export type TournamentFormatType = '6_TEAM' | '7_TEAM' | '8_TEAM';

export interface GroupFixtureDefinition {
  num: number;
  group: 'GROUP_A' | 'GROUP_B';
  slot: string;
  teamAIndex: number; // 0-indexed in group
  teamBIndex: number; // 0-indexed in group
  offsetHours: number;
}

export interface TournamentFormatConfig {
  format: TournamentFormatType;
  displayName: string;
  name: string; // alias for displayName
  badgeLabel: string;
  description: string;
  totalTeams: number;
  groupSizes: {
    GROUP_A: number;
    GROUP_B: number;
  };
  groupA: number; // alias for groupSizes.GROUP_A
  groupB: number; // alias for groupSizes.GROUP_B
  totalGroupMatches: number;
  groupMatches: number; // alias for totalGroupMatches
  totalMatches: number;
  hasWildcardStage: boolean;
  wildcardMatchCount: number;
  hasQualificationStage: boolean;
  qualificationMatchCount: number;
  playoffMatchCount: number;
  finalMatchCount: number;
  stages: Array<'GROUP' | 'WILDCARD' | 'QUALIFICATION' | 'PLAYOFFS' | 'FINAL'>;
  groupTopology?: 'FULL_ROUND_ROBIN' | 'SQUARE_CYCLE' | string;
  groupFixtures: GroupFixtureDefinition[];
}

/**
 * Authoritative format definitions for 6-Team, 7-Team, and 8-Team championships.
 */
export const TOURNAMENT_FORMAT_CONFIGS: Record<TournamentFormatType, TournamentFormatConfig> = {
  '6_TEAM': {
    format: '6_TEAM',
    displayName: '6-Team Championship',
    name: '6-Team Championship',
    badgeLabel: '6 TEAMS · 13 MATCHES',
    description: '2 Groups of 3 teams (Round-Robin), 3-match Wildcard (WC1–WC3), 3-match Playoffs (P1–P3), and Grand Final.',
    totalTeams: 6,
    groupSizes: {
      GROUP_A: 3,
      GROUP_B: 3,
    },
    groupA: 3,
    groupB: 3,
    totalGroupMatches: 6,
    groupMatches: 6,
    totalMatches: 13,
    hasWildcardStage: true,
    wildcardMatchCount: 3,
    hasQualificationStage: false,
    qualificationMatchCount: 0,
    playoffMatchCount: 3,
    finalMatchCount: 1,
    stages: ['GROUP', 'WILDCARD', 'PLAYOFFS', 'FINAL'],
    groupTopology: 'FULL_ROUND_ROBIN',
    // Full round-robin in each 3-team group, alternating A and B for maximum rest:
    // Group A: A1 vs A2, A2 vs A3, A1 vs A3
    // Group B: B1 vs B2, B2 vs B3, B1 vs B3
    groupFixtures: [
      { num: 1, group: 'GROUP_A', slot: 'G1', teamAIndex: 0, teamBIndex: 1, offsetHours: 0 }, // A1 vs A2
      { num: 2, group: 'GROUP_B', slot: 'G2', teamAIndex: 0, teamBIndex: 1, offsetHours: 1 }, // B1 vs B2
      { num: 3, group: 'GROUP_A', slot: 'G3', teamAIndex: 1, teamBIndex: 2, offsetHours: 2 }, // A2 vs A3
      { num: 4, group: 'GROUP_B', slot: 'G4', teamAIndex: 1, teamBIndex: 2, offsetHours: 3 }, // B2 vs B3
      { num: 5, group: 'GROUP_A', slot: 'G5', teamAIndex: 0, teamBIndex: 2, offsetHours: 4 }, // A1 vs A3
      { num: 6, group: 'GROUP_B', slot: 'G6', teamAIndex: 0, teamBIndex: 2, offsetHours: 5 }, // B1 vs B3
    ],
  },
  '7_TEAM': {
    format: '7_TEAM',
    displayName: '7-Team Championship',
    name: '7-Team Championship',
    badgeLabel: '7 TEAMS · 11 MATCHES',
    description: 'Group A (4 teams, 4-edge square graph, 2 matches/team), Group B (3 teams, Round-Robin, 2 matches/team), 3-match Playoffs, and Grand Final.',
    totalTeams: 7,
    groupSizes: {
      GROUP_A: 4,
      GROUP_B: 3,
    },
    groupA: 4,
    groupB: 3,
    totalGroupMatches: 7,
    groupMatches: 7,
    totalMatches: 11,
    hasWildcardStage: false,
    wildcardMatchCount: 0,
    hasQualificationStage: false,
    qualificationMatchCount: 0,
    playoffMatchCount: 3,
    finalMatchCount: 1,
    stages: ['GROUP', 'PLAYOFFS', 'FINAL'],
    groupTopology: 'SQUARE_CYCLE',
    // Group A: strictly 4 edges of the square graph (A1-A2, A2-A4, A4-A3, A3-A1). Zero diagonals.
    // Group B: full 3-match round-robin (B1-B2, B2-B3, B1-B3).
    // Alternating schedule with zero back-to-back matches:
    groupFixtures: [
      { num: 1, group: 'GROUP_A', slot: 'G1', teamAIndex: 0, teamBIndex: 1, offsetHours: 0 }, // A1 vs A2
      { num: 2, group: 'GROUP_B', slot: 'G2', teamAIndex: 0, teamBIndex: 1, offsetHours: 1 }, // B1 vs B2
      { num: 3, group: 'GROUP_A', slot: 'G3', teamAIndex: 2, teamBIndex: 3, offsetHours: 2 }, // A3 vs A4
      { num: 4, group: 'GROUP_B', slot: 'G4', teamAIndex: 1, teamBIndex: 2, offsetHours: 3 }, // B2 vs B3
      { num: 5, group: 'GROUP_A', slot: 'G5', teamAIndex: 1, teamBIndex: 3, offsetHours: 4 }, // A2 vs A4
      { num: 6, group: 'GROUP_B', slot: 'G6', teamAIndex: 0, teamBIndex: 2, offsetHours: 5 }, // B1 vs B3
      { num: 7, group: 'GROUP_A', slot: 'G7', teamAIndex: 2, teamBIndex: 0, offsetHours: 6 }, // A3 vs A1
    ],
  },
  '8_TEAM': {
    format: '8_TEAM',
    displayName: '8-Team Championship',
    name: '8-Team Championship',
    badgeLabel: '8 TEAMS · 16 MATCHES',
    description: '2 Groups of 4 (Full Round-Robin, 3 matches/team, 12 matches total), 3-match Playoffs (P1–P3), and Grand Final.',
    totalTeams: 8,
    groupSizes: {
      GROUP_A: 4,
      GROUP_B: 4,
    },
    groupA: 4,
    groupB: 4,
    totalGroupMatches: 12,
    groupMatches: 12,
    totalMatches: 16,
    hasWildcardStage: false,
    wildcardMatchCount: 0,
    hasQualificationStage: false,
    qualificationMatchCount: 0,
    playoffMatchCount: 3,
    finalMatchCount: 1,
    stages: ['GROUP', 'PLAYOFFS', 'FINAL'],
    groupTopology: 'FULL_ROUND_ROBIN',
    // Complete round-robin: 6 matches in Group A (1-6) and 6 matches in Group B (7-12)
    groupFixtures: [
      // Group A (M1–M6)
      { num: 1, group: 'GROUP_A', slot: 'G1', teamAIndex: 0, teamBIndex: 1, offsetHours: 0 }, // A1 vs A2
      { num: 2, group: 'GROUP_A', slot: 'G2', teamAIndex: 0, teamBIndex: 2, offsetHours: 1 }, // A1 vs A3
      { num: 3, group: 'GROUP_A', slot: 'G3', teamAIndex: 0, teamBIndex: 3, offsetHours: 2 }, // A1 vs A4
      { num: 4, group: 'GROUP_A', slot: 'G4', teamAIndex: 1, teamBIndex: 2, offsetHours: 3 }, // A2 vs A3
      { num: 5, group: 'GROUP_A', slot: 'G5', teamAIndex: 1, teamBIndex: 3, offsetHours: 4 }, // A2 vs A4
      { num: 6, group: 'GROUP_A', slot: 'G6', teamAIndex: 2, teamBIndex: 3, offsetHours: 5 }, // A3 vs A4
      // Group B (M7–M12)
      { num: 7, group: 'GROUP_B', slot: 'G7', teamAIndex: 0, teamBIndex: 1, offsetHours: 6 }, // B1 vs B2
      { num: 8, group: 'GROUP_B', slot: 'G8', teamAIndex: 0, teamBIndex: 2, offsetHours: 7 }, // B1 vs B3
      { num: 9, group: 'GROUP_B', slot: 'G9', teamAIndex: 0, teamBIndex: 3, offsetHours: 8 }, // B1 vs B4
      { num: 10, group: 'GROUP_B', slot: 'G10', teamAIndex: 1, teamBIndex: 2, offsetHours: 9 }, // B2 vs B3
      { num: 11, group: 'GROUP_B', slot: 'G11', teamAIndex: 1, teamBIndex: 3, offsetHours: 10 }, // B2 vs B4
      { num: 12, group: 'GROUP_B', slot: 'G12', teamAIndex: 2, teamBIndex: 3, offsetHours: 11 }, // B3 vs B4
    ],
  },
};

/**
 * Resolves tournament format safely and backward-compatibly.
 * Prioritizes tournament.tournamentFormat, then checks tournament.format, defaulting to 8_TEAM.
 */
export function resolveTournamentFormat(
  tournament?: string | { tournamentFormat?: string | null; format?: string | null } | null
): TournamentFormatType {
  if (typeof tournament === 'string') {
    const tf = tournament.toUpperCase().replace(/[\s-]/g, '_');
    if (tf.includes('6')) return '6_TEAM';
    if (tf.includes('7')) return '7_TEAM';
    if (tf.includes('8')) return '8_TEAM';
    return '8_TEAM';
  }
  if (tournament?.tournamentFormat) {
    const tf = tournament.tournamentFormat.toUpperCase().replace(/[\s-]/g, '_');
    if (tf.includes('6')) return '6_TEAM';
    if (tf.includes('7')) return '7_TEAM';
    if (tf.includes('8')) return '8_TEAM';
  }
  if (tournament?.format) {
    const f = tournament.format.toUpperCase().replace(/[\s-]/g, '_');
    if (f === '6_TEAM' || f.includes('6_TEAM') || f.includes('6TEAM')) return '6_TEAM';
    if (f === '7_TEAM' || f.includes('7_TEAM') || f.includes('7TEAM')) return '7_TEAM';
  }
  return '8_TEAM';
}

/**
 * Returns the format config for a tournament.
 */
export function getFormatConfig(
  tournament?: string | { tournamentFormat?: string | null; format?: string | null } | null
): TournamentFormatConfig {
  const format = resolveTournamentFormat(tournament);
  return TOURNAMENT_FORMAT_CONFIGS[format];
}
