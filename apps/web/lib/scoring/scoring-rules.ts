/**
 * Centralized Cricket Scoring Rules & MCC/ICC Conformance Engine
 *
 * Source of truth for:
 * 1. Dismissal legality validation (No-ball, Free Hit, Wide)
 * 2. Explicit bowler wicket-credit whitelist
 * 3. Dynamic all-out threshold calculation
 * 4. Authoritative delivery runs calculation (MCC Law 18.10.2 No-ball separation)
 * 5. Deterministic maiden-over calculation
 */

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
  | 'RETIRED_OUT'
  | 'HIT_BALL_TWICE'
  | 'OBSTRUCTING_FIELD'
  | 'OTHER';

/**
 * Explicit bowler wicket-credit whitelist.
 * ONLY genuine bowler-credited dismissals increment bowler wickets.
 * Never uses blacklist logic.
 */
export const BOWLER_CREDITED_WICKETS: readonly WicketTypeValue[] = [
  'BOWLED',
  'CAUGHT',
  'LBW',
  'STUMPED',
  'HIT_WICKET',
] as const;

export function isBowlerCreditedDismissal(wicketType?: WicketTypeValue | string | null): boolean {
  if (!wicketType) return false;
  return (BOWLER_CREDITED_WICKETS as readonly string[]).includes(wicketType);
}

/**
 * Server-side dismissal legality validation for deliveries.
 * Must run BEFORE mutating scoring state.
 *
 * Rules:
 * - On a No-ball or Free Hit, the ONLY permitted delivery dismissals are:
 *   RUN_OUT, HIT_BALL_TWICE, OBSTRUCTING_FIELD.
 *   Reject: BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET.
 *   (RETIRED_HURT and RETIRED_OUT are administrative non-delivery events, not delivery dismissals).
 * - On a Wide, reject: BOWLED, CAUGHT, LBW.
 *   Allow: RUN_OUT, STUMPED, HIT_WICKET, OBSTRUCTING_FIELD.
 */
export function validateDismissalLegality(params: {
  isWicket: boolean;
  wicketType?: WicketTypeValue | string | null;
  extraType: ExtraTypeValue | string;
  isFreeHit: boolean;
}): { valid: boolean; error?: string } {
  if (!params.isWicket || !params.wicketType) {
    return { valid: true };
  }

  const wt = params.wicketType as WicketTypeValue;
  const extraType = params.extraType as ExtraTypeValue;

  // 1. Free Hit Delivery Validation
  if (params.isFreeHit) {
    const allowedOnFreeHit: readonly WicketTypeValue[] = [
      'RUN_OUT',
      'HIT_BALL_TWICE',
      'OBSTRUCTING_FIELD',
    ];
    if (!allowedOnFreeHit.includes(wt)) {
      return {
        valid: false,
        error: `Illegal dismissal on Free Hit: Batters cannot be dismissed ${wt} on a Free Hit. Allowed: RUN_OUT, HIT_BALL_TWICE, OBSTRUCTING_FIELD.`,
      };
    }
  }

  // 2. No-ball Delivery Validation
  if (extraType === 'NO_BALL') {
    const allowedOnNoBall: readonly WicketTypeValue[] = [
      'RUN_OUT',
      'HIT_BALL_TWICE',
      'OBSTRUCTING_FIELD',
    ];
    if (!allowedOnNoBall.includes(wt)) {
      return {
        valid: false,
        error: `Illegal dismissal on No-ball: Batters cannot be dismissed ${wt} on a No-ball. Allowed: RUN_OUT, HIT_BALL_TWICE, OBSTRUCTING_FIELD.`,
      };
    }
  }

  // 3. Wide Delivery Validation
  if (extraType === 'WIDE') {
    const disallowedOnWide: readonly WicketTypeValue[] = ['BOWLED', 'CAUGHT', 'LBW'];
    if (disallowedOnWide.includes(wt)) {
      return {
        valid: false,
        error: `Illegal dismissal on Wide: Batters cannot be dismissed ${wt} on a Wide. Allowed: RUN_OUT, STUMPED, HIT_WICKET.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Evaluates whether the next delivery is a Free Hit from ball history.
 * Under tournament / CPL rules:
 * - There is NO Free Hit after a No-ball ("after noball there is no freehit").
 * - After a No-ball, the delivery is re-bowled as a normal delivery, and if a wicket
 *   falls on subsequent deliveries, that wicket is completely valid (Bowled, Caught, LBW, Stumped, etc.).
 *
 * @param _ballEvents Array of ball events ordered newest-first (createdAt desc)
 */
export function isFreeHitActive(_ballEvents?: Array<{ extraType?: string; isLegal?: boolean; createdAt?: any; overNumber?: number; ballNumber?: number }>): boolean {
  // Tournament Rule: No Free Hit after a No-ball. Subsequent deliveries permit all valid dismissals.
  return false;
}

/**
 * Calculates authoritative delivery runs, extras, and bowler-conceded runs.
 *
 * Adheres strictly to MCC Law 18.10.2 / ICC playing conditions:
 * If Byes or Leg Byes occur from a No-ball:
 * - The mandatory 1-run No-ball penalty is scored as a No-ball extra.
 * - Additional completed runs are scored as Byes or Leg Byes as appropriate.
 * - Bowler is charged ONLY for the No-ball penalty (1) + any runs off the bat,
 *   NOT for Byes or Leg Byes.
 */
export interface DeliveryRunsResult {
  totalRuns: number;
  batterRuns: number;
  bowlerRuns: number;
  noBallPenalty: number;
  wideRuns: number;
  byeRuns: number;
  legByeRuns: number;
  isLegal: boolean;
}

export function calculateDeliveryRuns(input: {
  runs?: number;
  extraType?: ExtraTypeValue | string;
  extras?: number;
  extraRuns?: number;
  byeRuns?: number;
  legByeRuns?: number;
}): DeliveryRunsResult {
  const extraType = (input.extraType || 'NONE') as ExtraTypeValue;
  const rawRuns = Number(input.runs || 0);
  const extraRunsParam = input.extraRuns !== undefined ? Number(input.extraRuns) : (input.extras !== undefined ? Number(input.extras) : 0);
  const inputByeRuns = Number(input.byeRuns || 0);
  const inputLegByeRuns = Number(input.legByeRuns || 0);

  if (extraType === 'NONE') {
    return {
      totalRuns: rawRuns,
      batterRuns: rawRuns,
      bowlerRuns: rawRuns,
      noBallPenalty: 0,
      wideRuns: 0,
      byeRuns: 0,
      legByeRuns: 0,
      isLegal: true,
    };
  }

  if (extraType === 'BYE') {
    const byes = extraRunsParam > 0 ? extraRunsParam : (inputByeRuns > 0 ? inputByeRuns : (rawRuns > 0 ? rawRuns : 1));
    return {
      totalRuns: byes,
      batterRuns: 0,
      bowlerRuns: 0,
      noBallPenalty: 0,
      wideRuns: 0,
      byeRuns: byes,
      legByeRuns: 0,
      isLegal: true,
    };
  }

  if (extraType === 'LEG_BYE') {
    const legByes = extraRunsParam > 0 ? extraRunsParam : (inputLegByeRuns > 0 ? inputLegByeRuns : (rawRuns > 0 ? rawRuns : 1));
    return {
      totalRuns: legByes,
      batterRuns: 0,
      bowlerRuns: 0,
      noBallPenalty: 0,
      wideRuns: 0,
      byeRuns: 0,
      legByeRuns: legByes,
      isLegal: true,
    };
  }

  if (extraType === 'WIDE') {
    // Under MCC Law 22:
    // Every wide incurs at least a 1-run penalty.
    // In addition, any runs completed by the batters or boundary runs are added to wides.
    // E.g., boundary 4 + 1 wide penalty = 5 wides (all charged to bowler as extras).
    // 1 run completed + 1 wide penalty = 2 wides.
    let totalWideRuns = 1;
    if (extraRunsParam > 0) {
      if (rawRuns > 0 && extraRunsParam === 1) {
        totalWideRuns = 1 + rawRuns;
      } else {
        totalWideRuns = Math.max(extraRunsParam, 1 + rawRuns);
      }
    } else if (rawRuns > 0) {
      totalWideRuns = 1 + rawRuns;
    }

    return {
      totalRuns: totalWideRuns,
      batterRuns: 0,
      bowlerRuns: totalWideRuns,
      noBallPenalty: 0,
      wideRuns: totalWideRuns,
      byeRuns: 0,
      legByeRuns: 0,
      isLegal: false,
    };
  }

  if (extraType === 'NO_BALL') {
    const penalty = extraRunsParam > 0 ? extraRunsParam : 1;
    const batterRuns = rawRuns;
    const byes = inputByeRuns;
    const legByes = inputLegByeRuns;
    const totalRuns = penalty + batterRuns + byes + legByes;
    const bowlerRuns = penalty + batterRuns; // Byes and Leg Byes NOT charged to bowler
    return {
      totalRuns,
      batterRuns,
      bowlerRuns,
      noBallPenalty: penalty,
      wideRuns: 0,
      byeRuns: byes,
      legByeRuns: legByes,
      isLegal: false,
    };
  }

  return {
    totalRuns: rawRuns,
    batterRuns: rawRuns,
    bowlerRuns: rawRuns,
    noBallPenalty: 0,
    wideRuns: 0,
    byeRuns: 0,
    legByeRuns: 0,
    isLegal: true,
  };
}

/**
 * Calculates bowler runs conceded from a ball event.
 * Byes and Leg Byes are 0 bowler runs.
 * No-ball charges 1 penalty + runs off the bat.
 * Wide charges wide runs.
 */
export function calculateBowlerRunsFromDelivery(ball: {
  runs?: number;
  extraType?: ExtraTypeValue | string;
  extras?: number;
  byeRuns?: number;
  legByeRuns?: number;
}): number {
  return calculateDeliveryRuns(ball).bowlerRuns;
}

/**
 * Determines the authoritative all-out wicket threshold for an innings.
 *
 * Rules:
 * - Super Over: exactly 2 wickets (regardless of lineup size).
 * - Explicit innings.maxWickets takes precedence if set.
 * - Otherwise: actual eligible batting lineup size - 1.
 *   (e.g., 8 players -> 7 wickets; 11 players -> 10 wickets).
 */
export function getInningsWicketLimit(
  innings?: {
    inningsNumber?: number;
    isSuperOver?: boolean;
    maxWickets?: number | null;
    battingLineupSize?: number | null;
    battingTeamId?: string;
    battingTeam?: any;
    battingScores?: any[];
  } | null,
  match?: any,
  fallbackLineupSize?: number
): number {
  const inningsNum = innings?.inningsNumber ?? 1;
  const isSuperOver = Boolean(innings?.isSuperOver || inningsNum >= 3);
  if (isSuperOver) {
    return 2;
  }

  if (innings?.maxWickets && innings.maxWickets > 0) {
    return innings.maxWickets;
  }

  if (innings?.battingLineupSize && innings.battingLineupSize > 1) {
    return innings.battingLineupSize - 1;
  }

  // Check batting team's actual squad in match or innings
  const battingTeam =
    innings?.battingTeam ||
    (match && innings?.battingTeamId
      ? match.teamAId === innings.battingTeamId
        ? match.teamA
        : match.teamBId === innings.battingTeamId
        ? match.teamB
        : null
      : null);

  let squadCount = 0;
  if (battingTeam) {
    if (Array.isArray(battingTeam.tournamentSquads) && battingTeam.tournamentSquads.length > 0) {
      squadCount = battingTeam.tournamentSquads.length;
    } else if (Array.isArray(battingTeam.teamPlayers) && battingTeam.teamPlayers.length > 0) {
      squadCount = battingTeam.teamPlayers.length;
    }
  }

  if (Array.isArray(innings?.battingScores) && innings.battingScores.length > squadCount) {
    squadCount = innings.battingScores.length;
  }

  if (squadCount > 1) {
    return squadCount - 1;
  }

  if (fallbackLineupSize && fallbackLineupSize > 1) {
    return fallbackLineupSize - 1;
  }

  // Standard cricket default (11-player lineup -> 10 wickets)
  return 10;
}

/**
 * Evaluates whether an innings is all-out.
 */
export function isAuthoritativeAllOut(
  innings?: {
    isAllOut?: boolean | null;
    wickets?: number;
    inningsNumber?: number;
    maxWickets?: number | null;
    battingLineupSize?: number | null;
    battingTeamId?: string;
    battingTeam?: any;
    battingScores?: any[];
  } | null,
  match?: any
): boolean {
  if (!innings) return false;
  if (innings.isAllOut === true) return true;
  const limit = getInningsWicketLimit(innings, match);
  return (innings.wickets || 0) >= limit;
}

/**
 * Pure deterministic maiden-over calculation from raw ball events history.
 *
 * A maiden over requires:
 * 1. Exactly `ballsPerOver` legal deliveries are bowled in that over.
 * 2. The bowler's conceded runs across that entire over equal zero.
 *
 * Incomplete/partial overs (e.g. innings ends early) DO NOT count as maidens.
 *
 * @param allBalls Chronological list of all ball events in the innings (ordered createdAt asc)
 * @param bowlerId Specific bowler ID to count maidens for (or omit to get map of all bowlers)
 * @param ballsPerOver Configured balls per over (e.g., 4, 5, 6)
 */
export function calculateMaidensMap(
  allBalls: Array<{
    bowlerId: string;
    runs?: number;
    extraType?: ExtraTypeValue | string;
    extras?: number;
    byeRuns?: number;
    legByeRuns?: number;
    isLegal: boolean;
  }>,
  ballsPerOver: number
): Record<string, number> {
  const maidensMap: Record<string, number> = {};
  if (!allBalls || allBalls.length === 0 || ballsPerOver <= 0) {
    return maidensMap;
  }

  // Group deliveries into overs by legal-ball index
  let legalBallCount = 0;
  let currentOverDeliveries: typeof allBalls = [];

  for (const b of allBalls) {
    currentOverDeliveries.push(b);

    if (b.isLegal) {
      legalBallCount++;

      // When legal balls reach configured ballsPerOver, over is COMPLETE
      if (legalBallCount % ballsPerOver === 0) {
        // Check if all balls in this completed over belong to the same bowler
        const firstBowler = currentOverDeliveries[0]?.bowlerId;
        const allSameBowler = currentOverDeliveries.every((d) => d.bowlerId === firstBowler);

        if (firstBowler && allSameBowler) {
          const totalConceded = currentOverDeliveries.reduce(
            (sum, d) => sum + calculateBowlerRunsFromDelivery(d),
            0
          );
          if (totalConceded === 0) {
            maidensMap[firstBowler] = (maidensMap[firstBowler] || 0) + 1;
          }
        }

        // Reset buffer for the next over
        currentOverDeliveries = [];
      }
    }
  }

  // Note: Any remaining balls in currentOverDeliveries represent a partial/incomplete over,
  // which by cricket law cannot count as a maiden.

  return maidensMap;
}

export function calculateBowlerMaidens(
  allBalls: Array<{
    bowlerId: string;
    runs?: number;
    extraType?: ExtraTypeValue | string;
    extras?: number;
    byeRuns?: number;
    legByeRuns?: number;
    isLegal: boolean;
  }>,
  bowlerId: string,
  ballsPerOver: number
): number {
  const map = calculateMaidensMap(allBalls, ballsPerOver);
  return map[bowlerId] || 0;
}

/**
 * Priority sorter for matches:
 * 1. LIVE matches first (most recently active/started first)
 * 2. COMPLETED matches next, ordered from recent to past (newest completedAt/updatedAt first)
 * 3. SCHEDULED / UPCOMING matches last, ordered chronologically (soonest scheduledAt first)
 */
export function sortMatchesByPriority<T extends {
  status?: string | null;
  completedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  startedAt?: string | Date | null;
  createdAt?: string | Date | null;
}>(matches: T[]): T[] {
  const getStatusRank = (status?: string | null): number => {
    const s = (status || '').toUpperCase();
    if (s === 'LIVE') return 1;
    if (s === 'COMPLETED') return 2;
    if (s === 'UPCOMING' || s === 'SCHEDULED') return 3;
    return 4; // ABANDONED / CANCELLED / other
  };

  return [...matches].sort((a, b) => {
    const rankA = getStatusRank(a.status);
    const rankB = getStatusRank(b.status);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Secondary sorting within each status category:
    if (rankA === 1) {
      // LIVE: most recently started or updated first
      const timeA = new Date(a.startedAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.startedAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }

    if (rankA === 2) {
      // COMPLETED: recent to past (descending)
      const timeA = new Date(a.completedAt || a.updatedAt || a.scheduledAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.completedAt || b.updatedAt || b.scheduledAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }

    if (rankA === 3) {
      // UPCOMING / SCHEDULED: soonest upcoming first (ascending)
      const timeA = new Date(a.scheduledAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.scheduledAt || b.createdAt || 0).getTime();
      return timeA - timeB;
    }

    // Other statuses (e.g. ABANDONED): most recent first
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

