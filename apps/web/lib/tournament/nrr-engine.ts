/**
 * Official CPL Softball Cricket Net Run Rate (NRR) & Standings Engine
 * 
 * Rules strictly implemented:
 * 1. Ball-based calculation: effectiveOvers = legalBalls / ballsPerOver.
 *    Tournament-configurable: e.g. 4, 5, or 6 balls/over.
 *    Never assume 4 balls unless the tournament configuration explicitly sets it to 4.
 *    Never treat notation "1.1" as decimal 1.1; with 4 balls/over, 5 legal balls = 1.25 effective overs.
 * 2. All-Out Rule: If a team is dismissed (all-out) before completing its allotted overs,
 *    the full allotted innings overs (oversPerInnings) are used for NRR calculation.
 *    Requires explicit isAllOut flag or dismissal wicket threshold. Does not infer all-out
 *    merely because an innings ended early.
 * 3. Stage Isolation: Group Stage NRR only considers GROUP matches for that group;
 *    Wildcard Stage NRR only considers WILDCARD matches.
 * 4. Raw Scoring Data Authority: Recalculates dynamically from raw match and innings records.
 * 5. Zero-Division Safety: Evaluates safely to 0.00 without NaN, Infinity, or -Infinity.
 * 6. Display vs Calculation: Full floating point precision used for ranking;
 *    standings display mathematical effective overs (e.g. 1.25) to 2 decimal places.
 * 7. Tie vs No-Result: Distinct result accounting for WIN, TIE, and NO_RESULT.
 * 8. Multi-way Head-to-Head: Complete 2-way and 3-way mini-league head-to-head resolution.
 */

export interface TournamentFormatSettings {
  ballsPerOver: number;      // Tournament-configurable: e.g. 4, 5, or 6 balls/over
  groupOvers: number;        // e.g. 4
  wildcardOvers: number;     // e.g. 5
  playoffOvers: number;      // e.g. 6
  finalOvers: number;        // e.g. 6
}

export interface InningsData {
  id: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  status: string;
  isAllOut?: boolean;
  ballEvents?: Array<{ isLegal: boolean; extraType?: string }>;
}

export interface MatchData {
  id: string;
  tournamentId: string;
  stage?: string | null;
  groupName?: string | null;
  matchNumber?: number | null;
  bracketSlot?: string | null;
  teamAId: string;
  teamBId: string;
  status: string; // 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED'
  result?: 'WIN' | 'TIE' | 'NO_RESULT' | null;
  winnerTeamId?: string | null;
  oversPerInnings: number;
  ballsPerOver: number;
  innings: InningsData[];
}

export interface TeamStanding {
  pos: number;
  teamId: string;
  teamName: string;
  teamShortName: string;
  logoUrl?: string | null;
  groupName?: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  oversFor: number;
  displayOversFor: string; // e.g. "12.25" - mathematical effective overs
  legalBallsFaced: number;
  runsAgainst: number;
  oversAgainst: number;
  displayOversAgainst: string; // e.g. "11.75" - mathematical effective overs
  legalBallsBowled: number;
  nrr: number; // Raw float for ranking
  displayNRR: string; // Formatted +X.XX / -X.XX / 0.00
  qualificationStatus: 'QUALIFIED' | 'WILDCARD' | 'ELIMINATED' | 'PENDING';
  totalWicketsTaken: number;
}

/**
 * Calculates exact mathematical overs from legal deliveries.
 * For 4-ball over: 5 balls -> 5 / 4 = 1.25 overs.
 * For 6-ball over: 7 balls -> 7 / 6 = 1.16666... overs.
 * For 5-ball over: 6 balls -> 6 / 5 = 1.2 overs.
 * NEVER parse cricket notation as decimal!
 * Missing configuration is treated as invalid rather than silently changing tournament rules.
 */
export function legalBallsToEffectiveOvers(legalBalls: number, ballsPerOver: number): number {
  if (!ballsPerOver || ballsPerOver <= 0) {
    throw new Error(`Invalid ballsPerOver configuration: ${ballsPerOver}. Must be a positive number.`);
  }
  if (!legalBalls || legalBalls <= 0) return 0;
  return legalBalls / ballsPerOver;
}

/**
 * Formats cricket notation for scoreboard display only (e.g. 5 balls in 4-ball over -> "1.1").
 * DO NOT use this for NRR mathematics!
 */
export function formatDisplayCricketOvers(legalBalls: number, ballsPerOver: number): string {
  if (!ballsPerOver || ballsPerOver <= 0 || !legalBalls || legalBalls <= 0) return '0.0';
  const completedOvers = Math.floor(legalBalls / ballsPerOver);
  const remainingBalls = legalBalls % ballsPerOver;
  return `${completedOvers}.${remainingBalls}`;
}

/**
 * Counts total legal balls in an innings.
 * Uses ballEvents if populated, or overs * ballsPerOver + balls.
 */
export function countInningsLegalBalls(innings: InningsData, ballsPerOver: number): number {
  if (innings.ballEvents && innings.ballEvents.length > 0) {
    return innings.ballEvents.filter((b) => b.isLegal !== false && b.extraType !== 'WIDE' && b.extraType !== 'NO_BALL').length;
  }
  return (innings.overs || 0) * ballsPerOver + (innings.balls || 0);
}

/**
 * Detects whether an innings ended due to all-out dismissal.
 * Does NOT infer all-out merely because an innings is completed early.
 */
export function isInningsAllOut(innings: InningsData, match: MatchData, ballsPerOver: number): boolean {
  // 1. Explicit all-out flag takes top precedence
  if (innings.isAllOut === true) {
    return true;
  }

  // 2. Only use wicket-based fallback if scoring model guarantees
  // that this wicket count represents dismissal of the innings.
  const isSuperOver = innings.inningsNumber >= 3;
  const wicketLimit = isSuperOver ? 2 : 10;

  if (innings.wickets >= wicketLimit) {
    return true;
  }

  return false;
}

/**
 * Evaluates the effective overs faced/bowled for an innings, strictly applying the All-Out Rule.
 */
export function calculateInningsEffectiveOvers(
  innings: InningsData,
  match: MatchData,
  ballsPerOver: number
): { runs: number; effectiveOvers: number; legalBalls: number; isAllOut: boolean; wickets: number } {
  if (!ballsPerOver || ballsPerOver <= 0) {
    throw new Error(`Invalid ballsPerOver configuration: ${ballsPerOver}. Must be a positive number.`);
  }
  if (!match.oversPerInnings || match.oversPerInnings <= 0) {
    throw new Error(`Invalid oversPerInnings configuration on match ${match.id}: ${match.oversPerInnings}.`);
  }

  const legalBalls = countInningsLegalBalls(innings, ballsPerOver);
  const allOut = isInningsAllOut(innings, match, ballsPerOver);

  let effectiveOvers = legalBallsToEffectiveOvers(legalBalls, ballsPerOver);

  // ALL-OUT RULE: If a team is dismissed (all-out) before completing its allotted overs,
  // use the full allotted innings overs for its NRR calculation.
  if (allOut) {
    effectiveOvers = match.oversPerInnings;
  }

  return {
    runs: innings.runs || 0,
    effectiveOvers,
    legalBalls,
    isAllOut: allOut,
    wickets: innings.wickets || 0,
  };
}

/**
 * Resolves ties among groups of teams using official hierarchy:
 * 1. Points
 * 2. Net Run Rate (full unrounded precision)
 * 3. Head-to-Head (2-way and 3-way mini-league)
 * 4. Total runs scored
 * 5. Total wickets taken
 * 6. Alphabetical fallback
 */
function sortStandingsWithTieBreakers(standings: TeamStanding[], relevantMatches: MatchData[]): TeamStanding[] {
  // Step 1: Group teams by Points and NRR (within micro-tolerance)
  const sorted = [...standings].sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. NRR
    if (Math.abs(b.nrr - a.nrr) > 0.000001) return b.nrr - a.nrr;
    return 0;
  });

  // Find clusters of tied teams (identical points and NRR)
  const result: TeamStanding[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].points === sorted[i].points &&
      Math.abs(sorted[j].nrr - sorted[i].nrr) <= 0.000001
    ) {
      j++;
    }

    const tiedCluster = sorted.slice(i, j);

    if (tiedCluster.length === 1) {
      result.push(tiedCluster[0]);
    } else if (tiedCluster.length === 2) {
      // 2-way Head-to-Head
      const [teamA, teamB] = tiedCluster;
      const h2h = relevantMatches.find(
        (m) =>
          (m.teamAId === teamA.teamId && m.teamBId === teamB.teamId) ||
          (m.teamAId === teamB.teamId && m.teamBId === teamA.teamId)
      );

      if (h2h && h2h.winnerTeamId === teamA.teamId) {
        result.push(teamA, teamB);
      } else if (h2h && h2h.winnerTeamId === teamB.teamId) {
        result.push(teamB, teamA);
      } else {
        // Fallback to Runs, Wickets, Alphabetical
        tiedCluster.sort((a, b) => {
          if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
          if (b.totalWicketsTaken !== a.totalWicketsTaken) return b.totalWicketsTaken - a.totalWicketsTaken;
          return a.teamName.localeCompare(b.teamName);
        });
        result.push(...tiedCluster);
      }
    } else if (tiedCluster.length === 3) {
      // 3-way Head-to-Head Mini-League
      const tiedTeamIds = new Set(tiedCluster.map((t) => t.teamId));
      const miniMatches = relevantMatches.filter(
        (m) => tiedTeamIds.has(m.teamAId) && tiedTeamIds.has(m.teamBId)
      );

      const miniPoints = new Map<string, number>();
      for (const t of tiedCluster) miniPoints.set(t.teamId, 0);

      for (const m of miniMatches) {
        if (m.winnerTeamId && miniPoints.has(m.winnerTeamId)) {
          miniPoints.set(m.winnerTeamId, (miniPoints.get(m.winnerTeamId) || 0) + 2);
        } else if (m.result === 'TIE' || m.result === 'NO_RESULT') {
          if (miniPoints.has(m.teamAId)) miniPoints.set(m.teamAId, (miniPoints.get(m.teamAId) || 0) + 1);
          if (miniPoints.has(m.teamBId)) miniPoints.set(m.teamBId, (miniPoints.get(m.teamBId) || 0) + 1);
        }
      }

      const pA = miniPoints.get(tiedCluster[0].teamId) || 0;
      const pB = miniPoints.get(tiedCluster[1].teamId) || 0;
      const pC = miniPoints.get(tiedCluster[2].teamId) || 0;

      // If mini-league points are not all identical, they separate the teams
      if (!(pA === pB && pB === pC)) {
        tiedCluster.sort((a, b) => {
          const ptA = miniPoints.get(a.teamId) || 0;
          const ptB = miniPoints.get(b.teamId) || 0;
          if (ptB !== ptA) return ptB - ptA;
          if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
          if (b.totalWicketsTaken !== a.totalWicketsTaken) return b.totalWicketsTaken - a.totalWicketsTaken;
          return a.teamName.localeCompare(b.teamName);
        });
      } else {
        // Cyclic 1-1-1 tie in mini-league: fall through to Runs Scored, then Wickets, then Alphabetical
        tiedCluster.sort((a, b) => {
          if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
          if (b.totalWicketsTaken !== a.totalWicketsTaken) return b.totalWicketsTaken - a.totalWicketsTaken;
          return a.teamName.localeCompare(b.teamName);
        });
      }
      result.push(...tiedCluster);
    } else {
      tiedCluster.sort((a, b) => {
        if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
        if (b.totalWicketsTaken !== a.totalWicketsTaken) return b.totalWicketsTaken - a.totalWicketsTaken;
        return a.teamName.localeCompare(b.teamName);
      });
      result.push(...tiedCluster);
    }

    i = j;
  }

  return result;
}

/**
 * Computes live stage standings and Net Run Rates strictly from completed match data.
 */
export function computeStageStandings(
  teams: Array<{ id: string; name: string; shortName: string; logoUrl?: string | null; groupName?: string | null }>,
  matches: MatchData[],
  stage: 'GROUP' | 'WILDCARD',
  targetGroupName?: string | null
): TeamStanding[] {
  // 1. Filter matches for this exact stage and optional group
  const relevantMatches = matches.filter((m) => {
    if (m.stage !== stage) return false;
    if (targetGroupName && m.groupName !== targetGroupName) return false;
    return m.status === 'COMPLETED';
  });

  // 2. Initialize team aggregates
  const teamStats = new Map<string, {
    teamId: string;
    teamName: string;
    teamShortName: string;
    logoUrl?: string | null;
    groupName?: string | null;
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    points: number;
    runsFor: number;
    oversFor: number;
    legalBallsFaced: number;
    runsAgainst: number;
    oversAgainst: number;
    legalBallsBowled: number;
    totalWicketsTaken: number;
  }>();

  for (const t of teams) {
    if (targetGroupName && t.groupName && t.groupName !== targetGroupName) continue;
    teamStats.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamShortName: t.shortName,
      logoUrl: t.logoUrl,
      groupName: t.groupName,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsFor: 0,
      oversFor: 0,
      legalBallsFaced: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      legalBallsBowled: 0,
      totalWicketsTaken: 0,
    });
  }

  // 3. Aggregate stats from completed matches
  for (const match of relevantMatches) {
    const statsA = teamStats.get(match.teamAId);
    const statsB = teamStats.get(match.teamBId);
    const ballsPerOver = match.ballsPerOver;

    if (!ballsPerOver || ballsPerOver <= 0) {
      throw new Error(`Match ${match.id} is missing valid ballsPerOver configuration.`);
    }

    if (statsA) statsA.played += 1;
    if (statsB) statsB.played += 1;

    // Determine result
    if (match.winnerTeamId) {
      // WIN
      if (statsA && match.winnerTeamId === match.teamAId) {
        statsA.won += 1;
        statsA.points += 2;
        if (statsB) statsB.lost += 1;
      } else if (statsB && match.winnerTeamId === match.teamBId) {
        statsB.won += 1;
        statsB.points += 2;
        if (statsA) statsA.lost += 1;
      }
    } else if (match.result === 'TIE') {
      // TIE
      if (statsA) {
        statsA.tied += 1;
        statsA.points += 1;
      }
      if (statsB) {
        statsB.tied += 1;
        statsB.points += 1;
      }
    } else if (match.result === 'NO_RESULT') {
      // NO RESULT (abandoned / washout)
      if (statsA) {
        statsA.noResult += 1;
        statsA.points += 1;
      }
      if (statsB) {
        statsB.noResult += 1;
        statsB.points += 1;
      }
    }

    // Process regular innings (innings 1 & 2)
    const mainInnings = (match.innings || []).filter((i) => i.inningsNumber === 1 || i.inningsNumber === 2);
    for (const inn of mainInnings) {
      const batStats = teamStats.get(inn.battingTeamId);
      const bowlStats = teamStats.get(inn.bowlingTeamId);
      const innEval = calculateInningsEffectiveOvers(inn, match, ballsPerOver);

      if (batStats) {
        batStats.runsFor += innEval.runs;
        batStats.oversFor += innEval.effectiveOvers;
        batStats.legalBallsFaced += innEval.legalBalls;
      }

      if (bowlStats) {
        bowlStats.runsAgainst += innEval.runs;
        bowlStats.oversAgainst += innEval.effectiveOvers;
        bowlStats.legalBallsBowled += innEval.legalBalls;
        bowlStats.totalWicketsTaken += innEval.wickets;
      }
    }
  }

  // 4. Compute NRR with full precision and format display
  const rawStandings: TeamStanding[] = Array.from(teamStats.values()).map((s) => {
    // Zero-division safety
    const runRateFor = s.oversFor > 0 ? s.runsFor / s.oversFor : 0;
    const runRateAgainst = s.oversAgainst > 0 ? s.runsAgainst / s.oversAgainst : 0;
    const nrr = runRateFor - runRateAgainst;

    let displayNRR = nrr.toFixed(2);
    if (nrr > 0 && !displayNRR.startsWith('+')) {
      displayNRR = `+${displayNRR}`;
    } else if (Math.abs(nrr) < 0.0001) {
      displayNRR = '0.00';
    }

    return {
      pos: 1,
      teamId: s.teamId,
      teamName: s.teamName,
      teamShortName: s.teamShortName,
      logoUrl: s.logoUrl,
      groupName: s.groupName,
      played: s.played,
      won: s.won,
      lost: s.lost,
      tied: s.tied,
      noResult: s.noResult,
      points: s.points,
      runsFor: s.runsFor,
      oversFor: s.oversFor,
      displayOversFor: s.oversFor.toFixed(2),
      legalBallsFaced: s.legalBallsFaced,
      runsAgainst: s.runsAgainst,
      oversAgainst: s.oversAgainst,
      displayOversAgainst: s.oversAgainst.toFixed(2),
      legalBallsBowled: s.legalBallsBowled,
      nrr,
      displayNRR,
      qualificationStatus: 'PENDING',
      totalWicketsTaken: s.totalWicketsTaken,
    };
  });

  // 5. Deterministic tie-breaking hierarchy (points -> NRR -> 2-way / 3-way H2H -> runsFor -> wickets -> alphabetical)
  const standings = sortStandingsWithTieBreakers(rawStandings, relevantMatches);

  // Assign positions (1, 2, 3)
  standings.forEach((s, idx) => {
    s.pos = idx + 1;
  });

  return standings;
}
