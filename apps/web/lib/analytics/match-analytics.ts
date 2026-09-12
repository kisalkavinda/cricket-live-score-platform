/**
 * Cricket Match Analytics & Commentary Helper Module
 * 
 * Computes:
 * 1. Over-by-over aggregated stats (runs, cumulative runs, wickets, 6s, maidens, run rate)
 * 2. Comparative worm trajectory & Manhattan charts (Team A vs Team B)
 * 3. Dynamic Live Chase Equation & Required Run Rate (RRR / CRR)
 * 4. Head-to-Head Boundary Counter for tournament tie-break regulations
 * 5. Ball-by-ball commentary generation and filtering
 */

import { isBowlerCreditedDismissal, calculateDeliveryRuns } from '../scoring/scoring-rules';

export interface OverSummary {
  overNumber: number; // 1-indexed (e.g. 1 for Over 1)
  runsInOver: number;
  cumulativeRuns: number;
  wicketsInOver: number;
  cumulativeWickets: number;
  sixesInOver: number;
  foursInOver: number;
  isMaiden: boolean;
  legalBalls: number;
  totalDeliveries: number;
  overRunRate: number;
  cumulativeRunRate: number;
  balls: any[];
}

export interface InningsAnalytics {
  inningsId: string;
  inningsNumber: number;
  teamName: string;
  teamShortName: string;
  teamLogoUrl?: string | null;
  totalRuns: number;
  totalWickets: number;
  oversCompleted: number;
  currentBalls: number;
  crr: number;
  foursCount: number;
  sixesCount: number;
  totalBoundaries: number;
  boundaryRuns: number;
  boundaryRunsPercentage: number;
  overs: OverSummary[];
}

export interface ChaseEquation {
  isChase: boolean;
  battingTeamName: string;
  bowlingTeamName: string;
  targetRuns: number;
  runsNeeded: number;
  ballsRemaining: number;
  oversRemainingFormatted: string;
  requiredRunRate: string;
  currentRunRate: string;
  wicketsInHand: number;
  equationText: string;
  status: 'AHEAD' | 'BEHIND' | 'PAR' | 'ACHIEVED' | 'DEFENDED';
}

export interface BoundaryComparison {
  teamA: {
    name: string;
    shortName: string;
    fours: number;
    sixes: number;
    totalBoundaries: number;
    boundaryRuns: number;
    boundaryPercentage: string;
  };
  teamB: {
    name: string;
    shortName: string;
    fours: number;
    sixes: number;
    totalBoundaries: number;
    boundaryRuns: number;
    boundaryPercentage: string;
  };
  leader: 'TEAM_A' | 'TEAM_B' | 'TIED';
  leadDifference: number;
  regulationRuleNote: string;
}

/**
 * Parses all ball events of an innings into over-by-over summaries.
 */
export function computeInningsAnalytics(
  innings: any,
  ballsPerOver: number = 6
): InningsAnalytics {
  if (!innings) {
    return {
      inningsId: '',
      inningsNumber: 0,
      teamName: 'Unknown',
      teamShortName: 'UNK',
      totalRuns: 0,
      totalWickets: 0,
      oversCompleted: 0,
      currentBalls: 0,
      crr: 0,
      foursCount: 0,
      sixesCount: 0,
      totalBoundaries: 0,
      boundaryRuns: 0,
      boundaryRunsPercentage: 0,
      overs: [],
    };
  }

  // Raw ball events sorted chronologically (oldest to newest)
  const rawBalls = [...(innings.ballEvents || [])].sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.overNumber * ballsPerOver + a.ballNumber) - (b.overNumber * ballsPerOver + b.ballNumber);
  });

  // Group balls by overNumber
  const oversMap = new Map<number, any[]>();
  let foursCount = 0;
  let sixesCount = 0;

  for (const b of rawBalls) {
    const ov = Number(b.overNumber ?? 0);
    if (!oversMap.has(ov)) {
      oversMap.set(ov, []);
    }
    oversMap.get(ov)!.push(b);

    const batRuns = Number(b.runs || 0);
    if (batRuns === 4) foursCount++;
    if (batRuns === 6) sixesCount++;
  }

  const maxOver = Math.max(
    innings.overs || 0,
    ...Array.from(oversMap.keys(), (k) => k + 1),
    1
  );

  const overSummaries: OverSummary[] = [];
  let cumRuns = 0;
  let cumWickets = 0;

  for (let ov = 0; ov < maxOver; ov++) {
    const overBalls = oversMap.get(ov) || [];
    let overRuns = 0;
    let overWickets = 0;
    let overSixes = 0;
    let overFours = 0;
    let legalCount = 0;
    let bowlerRunsCharged = 0;

    for (const b of overBalls) {
      const batRuns = Number(b.runs || 0);
      const extraRuns = Number(b.extras || 0);
      const totalBallRuns = batRuns + extraRuns;
      overRuns += totalBallRuns;

      if (b.extraType !== 'BYE' && b.extraType !== 'LEG_BYE') {
        bowlerRunsCharged += totalBallRuns;
      }

      if (b.isWicket && b.wicketType !== 'RETIRED_HURT') {
        overWickets++;
      }
      if (batRuns === 4) overFours++;
      if (batRuns === 6) overSixes++;
      if (b.isLegal) legalCount++;
    }

    cumRuns += overRuns;
    cumWickets += overWickets;

    // Maiden over: 6 legal balls bowled with 0 bowler runs charged
    const isMaiden = legalCount >= ballsPerOver && bowlerRunsCharged === 0;
    const overRunRate = overRuns;
    const completedOversFraction = ov + 1;
    const cumulativeRunRate = completedOversFraction > 0 ? Number((cumRuns / completedOversFraction).toFixed(2)) : 0;

    overSummaries.push({
      overNumber: ov + 1,
      runsInOver: overRuns,
      cumulativeRuns: cumRuns,
      wicketsInOver: overWickets,
      cumulativeWickets: cumWickets,
      sixesInOver: overSixes,
      foursInOver: overFours,
      isMaiden,
      legalBalls: legalCount,
      totalDeliveries: overBalls.length,
      overRunRate,
      cumulativeRunRate,
      balls: overBalls,
    });
  }

  const totalOversDec = (innings.overs || 0) + ((innings.balls || 0) / ballsPerOver);
  const crr = totalOversDec > 0 ? Number(((innings.runs || 0) / totalOversDec).toFixed(2)) : 0;
  const totalBoundaries = foursCount + sixesCount;
  const boundaryRuns = (foursCount * 4) + (sixesCount * 6);
  const boundaryRunsPercentage = (innings.runs || 0) > 0
    ? Number(((boundaryRuns / innings.runs) * 100).toFixed(1))
    : 0;

  return {
    inningsId: innings.id,
    inningsNumber: innings.inningsNumber,
    teamName: innings.battingTeam?.name || `Innings ${innings.inningsNumber}`,
    teamShortName: innings.battingTeam?.shortName || `INN${innings.inningsNumber}`,
    teamLogoUrl: innings.battingTeam?.logoUrl,
    totalRuns: innings.runs || cumRuns,
    totalWickets: innings.wickets || cumWickets,
    oversCompleted: innings.overs || 0,
    currentBalls: innings.balls || 0,
    crr,
    foursCount,
    sixesCount,
    totalBoundaries,
    boundaryRuns,
    boundaryRunsPercentage,
    overs: overSummaries,
  };
}

/**
 * Calculates real-time Required Run Rate & chase equation.
 */
export function calculateChaseEquation(
  match: any,
  ballsPerOver: number = 6
): ChaseEquation | null {
  if (!match || !Array.isArray(match.innings) || match.innings.length < 2) {
    return null;
  }

  const inn1 = match.innings.find((i: any) => i.inningsNumber === 1);
  const inn2 = match.innings.find((i: any) => i.inningsNumber === 2);

  if (!inn1 || !inn2) {
    return null;
  }

  const targetRuns = (inn1.runs || 0) + 1;
  const currentRuns = inn2.runs || 0;
  const currentWickets = inn2.wickets || 0;
  const runsNeeded = Math.max(0, targetRuns - currentRuns);

  const maxOvers = match.oversPerInnings || 20;
  const maxLegalBalls = maxOvers * ballsPerOver;
  const ballsBowled = ((inn2.overs || 0) * ballsPerOver) + (inn2.balls || 0);
  const ballsRemaining = Math.max(0, maxLegalBalls - ballsBowled);

  const remOvers = Math.floor(ballsRemaining / ballsPerOver);
  const remBalls = ballsRemaining % ballsPerOver;
  const oversRemainingFormatted = `${remOvers}.${remBalls}`;

  const rrr = ballsRemaining > 0
    ? ((runsNeeded / (ballsRemaining / ballsPerOver))).toFixed(2)
    : runsNeeded === 0 ? '0.00' : '∞';

  const totalOversDec = (inn2.overs || 0) + ((inn2.balls || 0) / ballsPerOver);
  const crr = totalOversDec > 0 ? (currentRuns / totalOversDec).toFixed(2) : '0.00';

  const wicketsInHand = Math.max(0, 10 - currentWickets);

  let status: ChaseEquation['status'] = 'PAR';
  if (currentRuns >= targetRuns) {
    status = 'ACHIEVED';
  } else if (ballsRemaining === 0 || currentWickets >= 10) {
    status = 'DEFENDED';
  } else if (parseFloat(crr) >= parseFloat(rrr)) {
    status = 'AHEAD';
  } else {
    status = 'BEHIND';
  }

  const battingTeamName = inn2.battingTeam?.name || 'Chasing Team';
  const bowlingTeamName = inn1.battingTeam?.name || 'Defending Team';

  let equationText = '';
  if (status === 'ACHIEVED') {
    equationText = `${battingTeamName} won the match! Target of ${targetRuns} reached.`;
  } else if (status === 'DEFENDED') {
    equationText = `${bowlingTeamName} won! ${battingTeamName} fell short by ${runsNeeded} runs.`;
  } else {
    equationText = `Need ${runsNeeded} runs in ${ballsRemaining} balls (RRR: ${rrr} • CRR: ${crr})`;
  }

  return {
    isChase: true,
    battingTeamName,
    bowlingTeamName,
    targetRuns,
    runsNeeded,
    ballsRemaining,
    oversRemainingFormatted,
    requiredRunRate: rrr,
    currentRunRate: crr,
    wicketsInHand,
    equationText,
    status,
  };
}

/**
 * Calculates head-to-head boundary counter for tournament tie-break regulations.
 */
export function calculateBoundaryComparison(
  match: any
): BoundaryComparison | null {
  if (!match || !Array.isArray(match.innings) || match.innings.length === 0) {
    return null;
  }

  const inn1 = match.innings.find((i: any) => i.inningsNumber === 1);
  const inn2 = match.innings.find((i: any) => i.inningsNumber === 2);

  const aData = computeInningsAnalytics(inn1);
  const bData = computeInningsAnalytics(inn2);

  const teamAName = inn1?.battingTeam?.name || match.teamA?.name || 'Team A';
  const teamAShort = inn1?.battingTeam?.shortName || match.teamA?.shortName || 'TMA';
  const teamBName = inn2?.battingTeam?.name || match.teamB?.name || 'Team B';
  const teamBShort = inn2?.battingTeam?.shortName || match.teamB?.shortName || 'TMB';

  const aBoundaries = aData.totalBoundaries;
  const bBoundaries = bData.totalBoundaries;

  let leader: 'TEAM_A' | 'TEAM_B' | 'TIED' = 'TIED';
  let leadDifference = 0;

  if (aBoundaries > bBoundaries) {
    leader = 'TEAM_A';
    leadDifference = aBoundaries - bBoundaries;
  } else if (bBoundaries > aBoundaries) {
    leader = 'TEAM_B';
    leadDifference = bBoundaries - aBoundaries;
  }

  const regulationRuleNote =
    'CPL Tournament Regulations (Section 14.3): In case of a tied match and tied Super Over, the team with the higher boundary count (4s + 6s combined) across main innings is declared the winner.';

  return {
    teamA: {
      name: teamAName,
      shortName: teamAShort,
      fours: aData.foursCount,
      sixes: aData.sixesCount,
      totalBoundaries: aBoundaries,
      boundaryRuns: aData.boundaryRuns,
      boundaryPercentage: `${aData.boundaryRunsPercentage}%`,
    },
    teamB: {
      name: teamBName,
      shortName: teamBShort,
      fours: bData.foursCount,
      sixes: bData.sixesCount,
      totalBoundaries: bBoundaries,
      boundaryRuns: bData.boundaryRuns,
      boundaryPercentage: `${bData.boundaryRunsPercentage}%`,
    },
    leader,
    leadDifference,
    regulationRuleNote,
  };
}

/**
 * Filter mode for ball-by-ball commentary.
 */
export type BallFilterMode = 'ALL' | 'BOUNDARIES' | 'WICKETS';

export interface FormattedCommentaryBall {
  id: string;
  overDecimal: string; // e.g. "14.3"
  overNumber: number;
  ballNumber: number;
  isLegal: boolean;
  isFreeHit?: boolean;
  isSuperOver?: boolean;
  runs: number;
  extras: number;
  extraType: string;
  isWicket: boolean;
  wicketType?: string | null;
  batsmanName: string;
  bowlerName: string;
  dismissedPlayerName?: string | null;
  outcomeBadge: {
    label: string;
    bg: string;
    color: string;
    borderColor: string;
    type: 'FOUR' | 'SIX' | 'WICKET' | 'EXTRA' | 'DOT' | 'RUNS' | 'RETIRED_HURT';
  };
  commentaryText: string;
  timestamp: string;
}

/**
 * Selects from an array of commentary variations using a stable seed or randomized selection.
 */
function selectVariation(items: string[], seed?: string | number): string {
  if (items.length === 0) return '';
  if (seed !== undefined && seed !== null && seed !== '') {
    const s = String(seed);
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % items.length;
    return items[idx];
  }
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Safely formats a date or ISO timestamp string into HH:MM.
 * Returns empty string if invalid or absent, preventing "Invalid Date" displays.
 */
export function formatBallTimestamp(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const formatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return formatted.includes('Invalid') ? '' : formatted;
  } catch {
    return '';
  }
}

/**
 * Generates dynamic, realistic cricket commentary featuring the batter and bowler names,
 * switching between randomized natural phrasing for each ball outcome.
 */
export function generateBallDescription(
  b: any,
  context?: {
    isFreeHit?: boolean;
    isSuperOver?: boolean;
    teamName?: string;
  }
): string {
  // Sanitize any existing stored commentary so that legacy records never display "free hit" or "no free hit"
  if (b.commentary && typeof b.commentary === 'string' && b.commentary.trim().length > 0) {
    let text = b.commentary.trim();
    if (/free\s*hit/i.test(text)) {
      text = text
        .replace(/\s*\(?(?:no\s+free\s*hit(?:\s+under\s+CPL\s+rules)?|CPL(?:\s+Rule)?:?\s*no\s+free\s*hit)\)?/gi, '')
        .replace(/\b(?:ON\s+)?FREE\s+HIT\b/gi, '')
        .replace(/FREE\s+HIT\s+SURVIVAL!\s*NOT\s*OUT!\s*/gi, '')
        .replace(/CAUGHT\s*\/\s*BOWLED\s+ON\s+FREE\s+HIT!\s*/gi, '')
        .replace(/NOT\s+OUT\s+ON\s+FREE\s+HIT!\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (!/free\s*hit/i.test(text) && text.length > 5) {
        return text;
      }
      // If still mentioning free hit or garbled, fall through to regenerate clean commentary below
    } else {
      return text;
    }
  }

  const bowler = b.bowler?.name || b.bowlerName || 'Bowler';
  const batter = b.batsman?.name || b.batsmanName || 'Batter';
  const runs = Number(b.runs || 0);
  const extras = Number(b.extras || 0);
  const seed = b.id || `${b.overNumber ?? 0}-${b.ballNumber ?? 1}-${runs}-${b.extraType || ''}`;
  const isSuperOver = Boolean(b.isSuperOver || context?.isSuperOver);
  const dismissed = b.dismissedPlayer?.name || b.dismissedPlayerName || batter;

  // -------------------------------------------------------------------------
  // CASE 1: NO BALL DELIVERY
  // -------------------------------------------------------------------------
  if (b.extraType === 'NO_BALL') {
    const isChestHeight = Boolean(
      b.noBallReason === 'CHEST_HEIGHT' ||
      (typeof b.commentary === 'string' && /chest\s*height/i.test(b.commentary))
    );
    const isChucking = Boolean(
      b.noBallReason === 'CHUCKING' ||
      (typeof b.commentary === 'string' && /chucking|illegal\s*action/i.test(b.commentary))
    );
    const isFullToss = Boolean(
      b.noBallReason === 'FULL_TOSS' ||
      (typeof b.commentary === 'string' && /full\s*toss|beamer/i.test(b.commentary))
    );
    const isHeight = Boolean(
      b.noBallReason === 'HEIGHT' ||
      (typeof b.commentary === 'string' && /height|bouncer/i.test(b.commentary))
    );

    if (isChestHeight) {
      if (runs === 6) {
        return selectVariation([
          `NO BALL (Above Chest Height) & SIX! Chest-high delivery punished with absolute disdain! ${batter} launches ${bowler} deep into the stands! 7 runs added (+1 run & extra delivery).`,
          `NO BALL (Above Chest Height) & SIX! Dangerous high ball over chest height hammered for six by ${batter}! Maximum runs (+1 penalty & extra ball).`,
        ], seed);
      }
      if (runs === 4) {
        return selectVariation([
          `NO BALL (Above Chest Height) & FOUR! High delivery above chest level crunched away to the boundary by ${batter}! 5 runs added (+1 run & extra delivery).`,
          `NO BALL (Above Chest Height) & FOUR! Pull shot cracked through the square boundary! 5 runs total conceded by ${bowler} (+ extra delivery).`,
        ], seed);
      }
      if (runs > 0) {
        return selectVariation([
          `NO BALL (Above Chest Height) + ${runs} RUNS! Delivery above chest height called on ${bowler}! ${batter} works it away for ${runs} runs, penalty added (+ extra ball).`,
          `NO BALL (Above Chest Height)! Chest-high ball signaled by the umpire! Batters hustle for ${runs} runs plus 1 penalty run (+ extra delivery).`,
        ], seed);
      }
      return selectVariation([
        `NO BALL (Above Chest Height)! Any delivery above chest height is called a No Ball! 1 penalty run awarded against ${bowler} and an extra delivery.`,
        `NO BALL (Above Chest Height)! High delivery called by the umpire! 1 extra run conceded by ${bowler} and delivery to be re-bowled.`,
      ], seed);
    }

    if (isChucking) {
      return selectVariation([
        `NO BALL (Chucking)! Illegal bowling action called by the umpire against ${bowler}! 1 penalty run awarded and extra delivery.`,
        `NO BALL (Illegal Bowling Action)! Chucking called on ${bowler}! Penalty run awarded, extra delivery to follow.`,
      ], seed);
    }

    if (isFullToss) {
      if (runs === 6) {
        return selectVariation([
          `NO BALL (Full Toss) & SIX! Above-waist high full toss punished with absolute disdain! ${batter} deposits ${bowler}'s beamer deep into the stands! 7 runs added (+1 run & extra delivery).`,
          `NO BALL (Full Toss) & SIX! Dangerous waist-high delivery from ${bowler} launched into orbit by ${batter}! Maximum runs (+1 penalty & extra ball)!`,
          `NO BALL (Full Toss) & SIX! Monster blow off the beamer! ${batter} hammers ${bowler} out of the ground! 7 runs total and extra delivery to follow!`
        ], seed);
      }
      if (runs === 4) {
        return selectVariation([
          `NO BALL (Full Toss) & FOUR! Smashed away to the boundary! High full toss from ${bowler} crunched away to the fence by ${batter}! 5 runs added (+1 penalty & extra ball)!`,
          `NO BALL (Full Toss) & FOUR! Dangerous waist-high delivery from ${bowler}, pulled ferociously for four by ${batter}! 5 runs and extra delivery to follow!`,
          `NO BALL (Full Toss) & FOUR! Crunched through the off side! ${batter} pounces on the high full toss from ${bowler}, finding the ropes (+1 run & extra delivery)!`
        ], seed);
      }
      if (runs > 0) {
        return selectVariation([
          `NO BALL (Full Toss) + ${runs} RUNS! Above-waist full toss called on ${bowler}! ${batter} works it away for ${runs} runs off the bat, penalty run added (+ extra ball)!`,
          `NO BALL (Full Toss)! Dangerous delivery above the waist by ${bowler}! Batters hustle for ${runs} runs, penalty added (+ extra delivery)!`,
          `NO BALL (Full Toss)! Waist-high beamer from ${bowler}! ${runs} runs taken, extra run conceded, and delivery to be re-bowled!`
        ], seed);
      }
      return selectVariation([
        `NO BALL (Full Toss)! Dangerous delivery above waist height called on ${bowler}! Umpire signals no-ball, penalty run awarded and extra delivery next!`,
        `NO BALL (Full Toss)! High full toss above waist height! Dangerous delivery called on ${bowler}, penalty run awarded and ball to be re-bowled!`,
        `NO BALL (Full Toss)! Beamer called! Umpire immediately signals no-ball against ${bowler} for excessive height! 1 penalty run & extra delivery to follow!`
      ], seed);
    }

    if (isHeight) {
      if (runs > 0) {
        return selectVariation([
          `NO BALL (Height) + ${runs} RUNS! Sharp bouncer flying way over the head of ${batter}! Signaled no-ball for excessive height, ${runs} runs taken, and extra delivery next!`,
          `NO BALL (Height)! Steep bouncer from ${bowler} sails too high! Umpire signals penalty run, batters take ${runs}, and delivery to be re-bowled!`
        ], seed);
      }
      return selectVariation([
        `NO BALL (Height)! Bouncer sails way over ${batter}'s head! Umpire signals no-ball for dangerous height from ${bowler}, penalty run awarded and extra delivery next!`,
        `NO BALL (Height)! Fast bouncer called too high by the square-leg umpire! 1 penalty run conceded by ${bowler} and ball to be re-bowled!`
      ], seed);
    }

    // Default: Overstep / Missing Crease Mark
    if (runs === 6) {
      return selectVariation([
        `NO BALL & SIX! Monster blow off the illegal delivery! ${bowler} misses the mark and oversteps! ${batter} launches it into the stands! 7 runs added and extra delivery next!`,
        `NO BALL & SIX! Massive strike from ${batter}! Smashes ${bowler} over the ropes off a front-foot no-ball! Penalty run plus six, and delivery to be re-bowled!`,
        `NO BALL & SIX! High delivery punished with absolute disdain by ${batter}! Maximum runs and 1 penalty run awarded!`
      ], seed);
    }
    if (runs === 4) {
      return selectVariation([
        `NO BALL & FOUR! Smashed away to the boundary! ${bowler} misses the crease mark and oversteps, ${batter} crunches it for four! 5 runs total and extra delivery next!`,
        `NO BALL & FOUR! Crunched through the covers! ${bowler} errs on the front crease mark, conceded four runs plus penalty, and delivery to be re-bowled!`,
        `NO BALL & FOUR! Pulled hard through the gap by ${batter}! Boundary scored off an illegal delivery (+1 penalty run & extra delivery)!`
      ], seed);
    }
    if (runs > 0) {
      return selectVariation([
        `NO BALL + ${runs} RUNS! ${bowler} misses the crease mark and oversteps! ${batter} and partner hustle for ${runs} runs off the bat, plus 1 penalty run, and extra delivery next!`,
        `NO BALL! Illegal delivery from ${bowler}, batters run ${runs} extra runs, and delivery will be re-bowled!`,
        `NO BALL! Front-foot overstep by ${bowler} missing the mark! ${runs} runs taken, extra run conceded, and delivery to be re-bowled!`
      ], seed);
    }
    return selectVariation([
      `NO BALL! ${bowler} misses the mark and oversteps the bowling crease! Penalty run awarded and extra delivery next for ${batter}!`,
      `NO BALL! Illegal delivery called on ${bowler}. Extra run conceded and delivery to be re-bowled!`,
      `NO BALL! Front-foot no-ball called on ${bowler} for missing the mark! The umpire signals a penalty run and an extra delivery next!`,
      `NO BALL! Dangerous delivery called on ${bowler}, penalty run awarded and extra delivery next!`
    ], seed);
  }

  // -------------------------------------------------------------------------
  // CASE 3: SUPER OVER SPECIAL DELIVERIES
  // -------------------------------------------------------------------------
  if (isSuperOver) {
    if (b.isWicket && b.wicketType !== 'RETIRED_HURT') {
      return selectVariation([
        `OUT IN SUPER OVER! Critical breakthrough! ${bowler} removes ${dismissed} in this high-voltage tie-break shootout!`,
        `WICKET IN SUPER OVER! Massive blow! ${dismissed} departs as ${bowler}'s team strikes in the super over!`,
        `OUT IN THE SUPER OVER! Huge moment! ${bowler} delivers under immense pressure to dismiss ${dismissed}!`
      ], seed);
    }
    if (runs === 6) {
      return selectVariation([
        `SUPER OVER SIX! Massive hit from ${batter}! High drama in the shootout as it sails into the crowd!`,
        `SUPER OVER MAXIMUM! ${batter} connects sweet as a nut off ${bowler} and launches it for six! What a strike under pressure!`,
        `SUPER OVER SIX! Monster blow from ${batter}! Huge momentum swing in the 1-over shootout!`
      ], seed);
    }
    if (runs === 4) {
      return selectVariation([
        `SUPER OVER FOUR! Crunched through the infield by ${batter}! Vital boundary in the Super Over!`,
        `SUPER OVER FOUR! ${batter} pierces the gap off ${bowler}! Four crucial runs in this shootout!`,
        `SUPER OVER BOUNDARY! Beautiful stroke from ${batter} brings four big runs in the Super Over!`
      ], seed);
    }
    if (runs === 0 && !b.extraType) {
      return selectVariation([
        `DOT IN SUPER OVER! Gold dust for ${bowler}! A priceless dot ball under maximum pressure!`,
        `DOT BALL IN SUPER OVER! Superb execution from ${bowler}! Every dot ball is worth its weight in gold!`,
        `SUPER OVER DOT! ${bowler} beats the bat of ${batter}! Immense pressure builds in the shootout!`
      ], seed);
    }
  }

  // -------------------------------------------------------------------------
  // CASE 4: REGULAR WICKETS
  // -------------------------------------------------------------------------
  if (b.isWicket) {
    const wt = b.wicketType || 'OUT';
    switch (wt) {
      case 'BOWLED':
        return selectVariation([
          `OUT! Bowled him! Cleaned up the stumps with absolute perfection! ${bowler} dismisses ${dismissed}!`,
          `OUT! Bowled him! What a delivery from ${bowler}! Beats ${dismissed} all ends up and crashes into the woodwork!`,
          `OUT! Bowled him! Searing delivery from ${bowler}, breaches the defense of ${dismissed} and shatters the timber!`
        ], seed);

      case 'CAUGHT':
        return selectVariation([
          `OUT! Caught! ${batter} goes for the big hit against ${bowler}, mistimes it high in the air and it is safely held by the fielder!`,
          `OUT! Caught! Breakthrough for ${bowler}! ${dismissed} looks to attack, but only chips it straight to the waiting fielder!`,
          `OUT! In the air and taken! Superb bowling from ${bowler}, inducing the mistake as ${dismissed} departs!`
        ], seed);

      case 'LBW':
        return selectVariation([
          `OUT! LBW! Trapped in front! Loud appeal from ${bowler} as ${dismissed} is struck on the pads, and the umpire raises the finger!`,
          `OUT! LBW! Plumb in front! ${bowler} strikes with pin-point accuracy, beating ${dismissed} on the inside edge!`,
          `OUT! LBW! Big appeal upheld! ${bowler} traps ${dismissed} right in front of middle and leg!`
        ], seed);

      case 'RUN_OUT':
        if (runs > 0) {
          return selectVariation([
            `OUT! RUN OUT! The batters complete ${runs} run${runs > 1 ? 's' : ''}, but attempting another ends in disaster! ${dismissed} is run out!`,
            `OUT! RUN OUT! ${runs} run${runs > 1 ? 's' : ''} completed safely, but going for the next run proves fatal! Brilliant fielding dismisses ${dismissed}!`,
            `OUT! RUN OUT! Good running for ${runs} run${runs > 1 ? 's' : ''}, but turning for more brings a direct hit to run out ${dismissed}!`
          ], seed);
        }
        return selectVariation([
          `OUT! RUN OUT! Direct hit at the stumps! ${dismissed} is caught well short of the crease after a risky run!`,
          `OUT! RUN OUT! Miscommunication between the wickets! Brilliant fielding ends ${dismissed}'s innings!`,
          `OUT! RUN OUT! Fielder swoops in with razor-sharp reflexes and whips off the bails to dismiss ${dismissed}!`
        ], seed);

      case 'STUMPED':
        return selectVariation([
          `OUT! Stumped! ${batter} is drawn forward by ${bowler}, beaten in flight and the wicketkeeper whips off the bails in a flash!`,
          `OUT! Stumped! Sharp glovework behind the stumps! ${bowler} deceives ${batter}, and the bails are off before the bat gets back!`,
          `OUT! Stumped! Drifting away from ${bowler}, ${batter} steps out and the keeper does the rest in milliseconds!`
        ], seed);

      case 'HIT_WICKET':
        return selectVariation([
          `OUT! Hit wicket! Unfortunate dismissal for ${dismissed}, disturbing the bails while executing the shot against ${bowler}!`,
          `OUT! Hit wicket! ${dismissed} steps back too deep and clips the stumps with the heels/bat against ${bowler}!`
        ], seed);

      case 'MANKAD':
      case 'RUN_OUT_NON_STRIKER':
        return selectVariation([
          `OUT! RUN OUT AT NON-STRIKER'S END! ${bowler} removes the bails as ${dismissed} backs up too far outside the crease!`,
          `OUT! Run out at the bowler's end! ${dismissed} is caught out of the crease before delivery!`
        ], seed);

      case 'OBSTRUCTING_FIELD':
        return selectVariation([
          `OUT! Obstructing the field! Rare dismissal as ${dismissed} is adjudged to have willfully obstructed the throw!`
        ], seed);

      case 'RETIRED_HURT':
        return selectVariation([
          `RETIRED HURT! ${dismissed} leaves the field unable to continue their innings.`,
          `RETIRED! ${dismissed} walks off with an injury concern.`
        ], seed);

      default:
        return selectVariation([
          `OUT! Wicket falls! ${bowler} strikes to remove ${dismissed} (${wt.toLowerCase().replace(/_/g, ' ')}).`,
          `OUT! Big moment in the match! ${bowler} provides the breakthrough as ${dismissed} walks back!`,
          `OUT! Breakthrough for ${bowler}! ${dismissed} is dismissed (${wt.toLowerCase().replace(/_/g, ' ')}).`
        ], seed);
    }
  }

  // -------------------------------------------------------------------------
  // CASE 5: SIXES & FOURS
  // -------------------------------------------------------------------------
  if (runs === 6) {
    return selectVariation([
      `SIX! Smashed high and handsome! ${batter} takes on ${bowler} and launches it all the way over the boundary ropes!`,
      `SIX! Clean strike from ${batter}! Reads ${bowler}'s delivery early and dispatches it into the stands for a maximum!`,
      `SIX! Monster hit! ${batter} stands tall against ${bowler} and sends the ball soaring for six!`,
      `SIX! Dispatched! ${bowler} drops it right in the slot and ${batter} punishes it with absolute authority!`,
      `SIX! Stand and deliver! ${batter} clears the front leg and sends ${bowler} miles over the ropes!`
    ], seed);
  }

  if (runs === 4) {
    return selectVariation([
      `FOUR! Timed beautifully by ${batter}! Finds the gap off ${bowler} and it races away to the boundary!`,
      `FOUR! Exquisite stroke from ${batter}! Punishes ${bowler}'s delivery with perfect placement to beat the infield!`,
      `FOUR! Cracking shot! ${batter} leans into the delivery from ${bowler} and drives it crisply to the fence!`,
      `FOUR! ${bowler} errs in length, and ${batter} pounces instantly through the gap for four runs!`,
      `FOUR! Pierces the infield with precision! ${batter} strokes ${bowler} away to the rope for four!`
    ], seed);
  }

  // -------------------------------------------------------------------------
  // CASE 6: WIDES (including 5 Wides & Wides with running)
  // -------------------------------------------------------------------------
  if (b.extraType === 'WIDE') {
    if (extras >= 5) {
      return selectVariation([
        `5 WIDES! Wild delivery from ${bowler} beats both ${batter} and the keeper, racing all the way to the boundary fence for 5 extras!`,
        `5 WIDES! Wayward bouncer sails over the keeper's head and races to the boundary cushion! 5 bonus runs conceded by ${bowler}!`,
        `5 WIDES! High and wide! Wicketkeeper had no chance, ball reaches the rope for five penalty runs!`
      ], seed);
    }
    if (extras > 1) {
      return selectVariation([
        `WIDE + ${extras - 1} RUNS! Wide ball signaled and ${batter} with partner scamper through for extra bonus runs as the keeper chases!`,
        `WIDE + ${extras - 1}! Wayward ball from ${bowler}, and smart running between the wickets earns ${extras} total extras!`,
        `WIDE + ${extras - 1} RUNS! ${bowler} sprays it outside the tramline, allowing batters to take extra runs on the overthrow/miss!`
      ], seed);
    }
    return selectVariation([
      `Wide ball. ${bowler} strays outside the tramline, extra run conceded to ${batter}'s team.`,
      `Wide ball. Wayward delivery from ${bowler}, passing well outside the reach of ${batter}. Extra run awarded.`,
      `Wide ball. ${bowler} loses radar outside off, umpire stretches arms to signal an extra run.`
    ], seed);
  }

  // -------------------------------------------------------------------------
  // CASE 7: BYES & LEG BYES (including 4 byes / boundaries)
  // -------------------------------------------------------------------------
  if (b.extraType === 'BYE') {
    if (extras >= 4) {
      return selectVariation([
        `4 BYES! Deceptive delivery from ${bowler} beats batter and wicketkeeper, racing all the way to the fence for four byes!`,
        `4 BYES! Squirts past the keeper and rolls across the boundary cushion for four byes!`,
        `4 BYES! Sharp bounce beats everyone and reaches the boundary rope!`
      ], seed);
    }
    return selectVariation([
      `${extras || 1} Bye. Through to the wicketkeeper, ${batter} calls through and they scamper for a bye.`,
      `${extras || 1} Bye. Deceptive delivery from ${bowler}, beats both ${batter} and keeper for a bye.`,
      `${extras || 1} Bye. Good hustle between the wickets as the ball rolls into the outfield.`
    ], seed);
  }

  if (b.extraType === 'LEG_BYE') {
    if (extras >= 4) {
      return selectVariation([
        `4 LEG BYES! Deflects off the pads of ${batter} and races past fine leg all the way to the fence for four!`,
        `4 LEG BYES! Angled into the pads by ${bowler}, ball runs away to the rope for four leg byes!`,
        `4 LEG BYES! Glances off the thigh pad and speeds away to the boundary cushion!`
      ], seed);
    }
    return selectVariation([
      `${extras || 1} Leg Bye. ${bowler}'s delivery deflects off ${batter}'s pad into the outfield, batters complete the run.`,
      `${extras || 1} Leg Bye. Angled into the pads by ${bowler}, ${batter} and partner hurry through for a leg bye.`,
      `${extras || 1} Leg Bye. Deflection into square leg, allowing a quick single.`
    ], seed);
  }

  // -------------------------------------------------------------------------
  // CASE 8: DOT BALLS
  // -------------------------------------------------------------------------
  if (runs === 0) {
    return selectVariation([
      `Dot ball. Good bowling by ${bowler}, and ${batter} defends solidly back down the pitch.`,
      `Dot ball. ${bowler} hits a tight line, ${batter} plays it watchfully into the infield with no run taken.`,
      `Dot ball. Beaten! ${bowler} tests ${batter} with sharp line and length, no run.`,
      `Dot ball. ${batter} pushes ${bowler}'s delivery toward the fielder, unable to pierce the gap.`,
      `Dot ball. Well bowled by ${bowler}! Kept full and straight, defended back into the pitch.`
    ], seed);
  }

  // -------------------------------------------------------------------------
  // CASE 9: RUNNING RUNS (1, 2, 3)
  // -------------------------------------------------------------------------
  if (runs === 1) {
    return selectVariation([
      `1 run. ${batter} works ${bowler}'s delivery away into the gap to rotate the strike.`,
      `1 run. Pushed into the outfield by ${batter} off ${bowler} for a comfortable single.`,
      `1 run. ${batter} knocks it off ${bowler} with soft hands and scampers across to the non-striker's end.`,
      `1 run. ${bowler} pitches on length, ${batter} guides it safely into space to pick up one.`,
      `1 run. Tucked away toward mid-wicket by ${batter}, good communication brings a single.`
    ], seed);
  }

  if (runs === 2) {
    return selectVariation([
      `2 runs. ${batter} clips ${bowler}'s ball into the deep, good hustle between the wickets brings two runs!`,
      `2 runs. Excellent running by ${batter}! Works ${bowler} away and turns back hard to complete the brace.`,
      `2 runs. Driven into open territory off ${bowler}, ${batter} and partner push hard for two.`,
      `2 runs. Nicely placed into the outfield by ${batter}, turning one into two with quick sprint!`
    ], seed);
  }

  if (runs === 3) {
    return selectVariation([
      `3 runs. Superb placement by ${batter} off ${bowler}, and brilliant running turns two into three!`,
      `3 runs. ${batter} pierces the outfield off ${bowler}, allowing them to sprint back for three runs.`,
      `3 runs. Great hustle! Long chase for the deep fielder while ${batter} and partner run three!`
    ], seed);
  }

  return selectVariation([
    `${runs} runs scored by ${batter} off the bowling of ${bowler}.`,
    `${batter} takes ${runs} runs off ${bowler}'s delivery.`,
    `${runs} runs added to the total off ${bowler}.`
  ], seed);
}

/**
 * Returns formatted outcome badge styling for visual representation.
 */
export function getBallBadgeStyle(b: any): FormattedCommentaryBall['outcomeBadge'] {
  const batRuns = Number(b.runs || 0);

  if (b.isWicket) {
    if (b.wicketType === 'RETIRED_HURT') {
      return {
        label: batRuns > 0 ? `${batRuns}+RH` : 'RH',
        bg: '#0284C7',
        color: '#FFFFFF',
        borderColor: '#0369A1',
        type: 'RETIRED_HURT',
      };
    }
    const extraRuns = Number(b.extras || 0);
    let label = 'W';
    if (b.extraType === 'WIDE') {
      label = batRuns > 0 ? `WD+${batRuns}+W` : (extraRuns > 1 ? `WD+${extraRuns - 1}+W` : 'WD+W');
    } else if (b.extraType === 'NO_BALL') {
      label = batRuns > 0 ? `NB+${batRuns}+W` : 'NB+W';
    } else if (batRuns > 0) {
      label = `${batRuns}+W`;
    }

    return {
      label,
      bg: '#EF4444',
      color: '#FFFFFF',
      borderColor: '#DC2626',
      type: 'WICKET',
    };
  }

  if (b.extraType === 'WIDE') {
    return {
      label: b.extras > 1 ? `WD+${b.extras - 1}` : 'WD',
      bg: '#F59E0B',
      color: '#000000',
      borderColor: '#D97706',
      type: 'EXTRA',
    };
  }

  if (b.extraType === 'NO_BALL') {
    const bCalc = calculateDeliveryRuns(b);
    let label = 'NB';
    if (bCalc.byeRuns > 0) {
      label = `NB+${bCalc.byeRuns}B`;
    } else if (bCalc.legByeRuns > 0) {
      label = `NB+${bCalc.legByeRuns}LB`;
    } else if (bCalc.batterRuns > 0) {
      label = `NB+${bCalc.batterRuns}`;
    }
    return {
      label,
      bg: '#F97316',
      color: '#000000',
      borderColor: '#EA580C',
      type: 'EXTRA',
    };
  }

  if (batRuns === 6) {
    return {
      label: '6',
      bg: '#8B5CF6',
      color: '#FFFFFF',
      borderColor: '#7C3AED',
      type: 'SIX',
    };
  }

  if (batRuns === 4) {
    return {
      label: '4',
      bg: '#10B981',
      color: '#FFFFFF',
      borderColor: '#059669',
      type: 'FOUR',
    };
  }

  if (b.extraType === 'BYE') {
    return {
      label: `${b.extras || 1}B`,
      bg: 'rgba(255, 255, 255, 0.15)',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      type: 'EXTRA',
    };
  }

  if (b.extraType === 'LEG_BYE') {
    return {
      label: `${b.extras || 1}LB`,
      bg: 'rgba(255, 255, 255, 0.15)',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      type: 'EXTRA',
    };
  }

  if (batRuns === 0) {
    return {
      label: '•',
      bg: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.4)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      type: 'DOT',
    };
  }

  return {
    label: `${batRuns}`,
    bg: 'rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    type: 'RUNS',
  };
}

/**
 * Filters and formats commentary list for timeline rendering,
 * sequentially resolving Free Hit states, Super Over contexts, and rich descriptions.
 */
export function filterCommentaryBalls(
  rawBalls: any[],
  filter: BallFilterMode = 'ALL',
  options?: {
    isSuperOver?: boolean;
    teamName?: string;
  }
): FormattedCommentaryBall[] {
  if (!Array.isArray(rawBalls)) return [];

  const getBallTimestamp = (b: any): number => {
    if (!b) return 0;
    if (b.createdAt instanceof Date) {
      const t = b.createdAt.getTime();
      if (!isNaN(t)) return t;
    }
    if (typeof b.createdAt === 'string') {
      const t = new Date(b.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (typeof b.createdAt === 'number' && !isNaN(b.createdAt)) {
      return b.createdAt;
    }
    if (typeof b.id === 'string' && b.id.startsWith('temp-')) {
      const t = Number(b.id.replace('temp-', ''));
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Sort chronologically (oldest to newest) to accurately calculate sequential Free Hit states
  const chrono = [...rawBalls].sort((a: any, b: any) => {
    const timeA = getBallTimestamp(a);
    const timeB = getBallTimestamp(b);
    if (timeA && timeB && timeA !== timeB) return timeA - timeB;
    const overDiff = (a.overNumber ?? 0) - (b.overNumber ?? 0);
    if (overDiff !== 0) return overDiff;
    return (a.ballNumber ?? 0) - (b.ballNumber ?? 0);
  });

  // Under tournament rules, NO Free Hit after No-ball
  const decorated = chrono.map((b: any) => {
    const isFreeHit = false;

    const isSuperOver = Boolean(
      options?.isSuperOver ||
      b.isSuperOver ||
      b.inningsNumber === 3 ||
      b.inningsNumber === 4
    );

    return {
      ...b,
      isFreeHit,
      isSuperOver,
    };
  });

  // Now sort newest first for timeline feed
  const sorted = [...decorated].sort((a: any, b: any) => {
    const timeA = getBallTimestamp(a);
    const timeB = getBallTimestamp(b);
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    const overDiff = (b.overNumber ?? 0) - (a.overNumber ?? 0);
    if (overDiff !== 0) return overDiff;
    return (b.ballNumber ?? 0) - (a.ballNumber ?? 0);
  });

  const filtered = sorted.filter((b: any) => {
    if (filter === 'BOUNDARIES') {
      return Number(b.runs || 0) === 4 || Number(b.runs || 0) === 6;
    }
    if (filter === 'WICKETS') {
      return Boolean(b.isWicket);
    }
    return true;
  });

  return filtered.map((b: any) => {
    const ov = b.overNumber ?? 0;
    const bNum = b.ballNumber ?? 1;
    const overDecimal = `${ov}.${bNum}`;

    return {
      id: b.id || `${ov}-${bNum}-${b.createdAt}`,
      overDecimal,
      overNumber: ov,
      ballNumber: bNum,
      isLegal: Boolean(b.isLegal),
      isFreeHit: b.isFreeHit,
      isSuperOver: b.isSuperOver,
      runs: Number(b.runs || 0),
      extras: Number(b.extras || 0),
      extraType: b.extraType || 'NONE',
      isWicket: Boolean(b.isWicket),
      wicketType: b.wicketType,
      batsmanName: b.batsman?.name || b.batsmanName || 'Batsman',
      bowlerName: b.bowler?.name || b.bowlerName || 'Bowler',
      dismissedPlayerName: b.dismissedPlayer?.name || b.dismissedPlayerName,
      outcomeBadge: getBallBadgeStyle(b),
      commentaryText: generateBallDescription(b, {
        isFreeHit: b.isFreeHit,
        isSuperOver: b.isSuperOver,
        teamName: options?.teamName,
      }),
      timestamp: formatBallTimestamp(b.createdAt),
    };
  });
}

/**
 * Innings summary card data structure for full innings review and Super Over breakdowns.
 */
export interface InningsSummaryCardData {
  inningsNumber: number;
  isSuperOver: boolean;
  teamName: string;
  teamShortName: string;
  totalRuns: number;
  totalWickets: number;
  oversCompleted: number;
  currentBalls: number;
  totalOversFormatted: string;
  crr: string;
  foursCount: number;
  sixesCount: number;
  totalBoundaries: number;
  boundaryRuns: number;
  boundaryPercentage: string;
  topBatters: Array<{
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: string;
    isNotOut: boolean;
  }>;
  topBowlers: Array<{
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    economy: string;
  }>;
  targetEquationText?: string;
  resultText?: string;
}

/**
 * Computes a high-level summary card of an innings or Super Over,
 * featuring top performers, boundary percentages, and target/result status.
 */
export function computeInningsSummary(
  innings: any,
  match?: any,
  ballsPerOver: number = 6
): InningsSummaryCardData {
  const isSuperOver = Boolean(
    innings?.isSuperOver ||
    innings?.inningsNumber === 3 ||
    innings?.inningsNumber === 4
  );

  const teamName = innings?.battingTeam?.name || 'Batting Team';
  const teamShortName = innings?.battingTeam?.shortName || 'BAT';
  const totalRuns = Number(innings?.runs || 0);
  const totalWickets = Number(innings?.wickets || 0);
  const oversCompleted = Number(innings?.overs || 0);
  const currentBalls = Number(innings?.balls || 0);
  const totalOversFormatted = `${oversCompleted}.${currentBalls}`;

  const totalOversDecimal = oversCompleted + (currentBalls / ballsPerOver);
  const crr = totalOversDecimal > 0 ? (totalRuns / totalOversDecimal).toFixed(2) : '0.00';

  const rawBalls = innings?.ballEvents || [];
  let foursCount = 0;
  let sixesCount = 0;
  for (const b of rawBalls) {
    const r = Number(b.runs || 0);
    if (r === 4) foursCount++;
    if (r === 6) sixesCount++;
  }
  const totalBoundaries = foursCount + sixesCount;
  const boundaryRuns = (foursCount * 4) + (sixesCount * 6);
  const boundaryPercentage = totalRuns > 0 ? ((boundaryRuns / totalRuns) * 100).toFixed(1) : '0.0';

  // Compute top batters
  let topBatters: InningsSummaryCardData['topBatters'] = [];
  if (Array.isArray(innings?.battingPerformances) && innings.battingPerformances.length > 0) {
    topBatters = innings.battingPerformances
      .map((bp: any) => {
        const runs = Number(bp.runs || 0);
        const balls = Number(bp.balls || 0);
        const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
        return {
          name: bp.player?.name || bp.playerName || 'Batter',
          runs,
          balls,
          fours: Number(bp.fours || 0),
          sixes: Number(bp.sixes || 0),
          strikeRate: sr,
          isNotOut: !bp.isOut,
        };
      })
      .sort((a: any, b: any) => b.runs - a.runs)
      .slice(0, 4);
  } else if (rawBalls.length > 0) {
    const batterMap = new Map<string, { runs: number; balls: number; fours: number; sixes: number; isOut: boolean }>();
    for (const b of rawBalls) {
      const name = b.batsman?.name || b.batsmanName || 'Batter';
      if (!batterMap.has(name)) {
        batterMap.set(name, { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false });
      }
      const entry = batterMap.get(name)!;
      const r = Number(b.runs || 0);
      entry.runs += r;
      if (b.extraType !== 'WIDE') entry.balls += 1;
      if (r === 4) entry.fours += 1;
      if (r === 6) entry.sixes += 1;
      if (b.isWicket && (b.dismissedPlayer?.name === name || (!b.dismissedPlayer && b.batsmanName === name))) {
        entry.isOut = true;
      }
    }
    topBatters = Array.from(batterMap.entries())
      .map(([name, stats]) => ({
        name,
        runs: stats.runs,
        balls: stats.balls,
        fours: stats.fours,
        sixes: stats.sixes,
        strikeRate: stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0',
        isNotOut: !stats.isOut,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 4);
  }

  // Compute top bowlers
  let topBowlers: InningsSummaryCardData['topBowlers'] = [];
  if (Array.isArray(innings?.bowlingPerformances) && innings.bowlingPerformances.length > 0) {
    topBowlers = innings.bowlingPerformances
      .map((bp: any) => {
        const overs = Number(bp.overs || 0);
        const balls = Number(bp.balls || 0);
        const runs = Number(bp.runsConceded || 0);
        const totalOversDec = overs + (balls / ballsPerOver);
        const econ = totalOversDec > 0 ? (runs / totalOversDec).toFixed(2) : '0.00';
        return {
          name: bp.player?.name || bp.playerName || 'Bowler',
          overs: `${overs}.${balls}`,
          maidens: Number(bp.maidens || 0),
          runs,
          wickets: Number(bp.wickets || 0),
          economy: econ,
        };
      })
      .sort((a: any, b: any) => b.wickets - a.wickets || parseFloat(a.economy) - parseFloat(b.economy))
      .slice(0, 3);
  } else if (rawBalls.length > 0) {
    const bowlerMap = new Map<string, { legalBalls: number; runs: number; wickets: number }>();
    for (const b of rawBalls) {
      const name = b.bowler?.name || b.bowlerName || 'Bowler';
      if (!bowlerMap.has(name)) {
        bowlerMap.set(name, { legalBalls: 0, runs: 0, wickets: 0 });
      }
      const entry = bowlerMap.get(name)!;
      entry.runs += Number(b.runs || 0) + Number(b.extras || 0);
      if (b.isLegal) entry.legalBalls += 1;
      if (b.isWicket && isBowlerCreditedDismissal(b.wicketType)) entry.wickets += 1;
    }
    topBowlers = Array.from(bowlerMap.entries())
      .map(([name, stats]) => {
        const ov = Math.floor(stats.legalBalls / ballsPerOver);
        const bl = stats.legalBalls % ballsPerOver;
        const totalOversDec = ov + (bl / ballsPerOver);
        const econ = totalOversDec > 0 ? (stats.runs / totalOversDec).toFixed(2) : '0.00';
        return {
          name,
          overs: `${ov}.${bl}`,
          maidens: 0,
          runs: stats.runs,
          wickets: stats.wickets,
          economy: econ,
        };
      })
      .sort((a, b) => b.wickets - a.wickets || parseFloat(a.economy) - parseFloat(b.economy))
      .slice(0, 3);
  }

  let targetEquationText = '';
  let resultText = '';

  if (innings?.inningsNumber === 1 || innings?.inningsNumber === 3) {
    const maxBalls = isSuperOver ? ballsPerOver : (match?.oversPerInnings || 20) * ballsPerOver;
    targetEquationText = `Target: ${totalRuns + 1} runs to win from ${maxBalls} balls`;
  } else if (innings?.inningsNumber === 2 || innings?.inningsNumber === 4) {
    const prevInnNum = innings.inningsNumber - 1;
    const prevInn = match?.innings?.find((i: any) => i.inningsNumber === prevInnNum);
    if (prevInn) {
      const target = prevInn.runs + 1;
      const needed = Math.max(0, target - totalRuns);
      const totalBallsMatch = isSuperOver ? ballsPerOver : (match?.oversPerInnings || 20) * ballsPerOver;
      const ballsBowled = (oversCompleted * ballsPerOver) + currentBalls;
      const ballsLeft = Math.max(0, totalBallsMatch - ballsBowled);
      const rrr = ballsLeft > 0 ? ((needed / ballsLeft) * ballsPerOver).toFixed(2) : '0.00';

      if (match?.status === 'COMPLETED' || totalRuns >= target) {
        resultText = match?.resultDescription || (totalRuns >= target ? `${teamName} won the match!` : 'Match concluded');
      } else {
        targetEquationText = `Need ${needed} runs from ${ballsLeft} balls (RRR: ${rrr})`;
      }
    }
  }

  return {
    inningsNumber: innings?.inningsNumber || 1,
    isSuperOver,
    teamName,
    teamShortName,
    totalRuns,
    totalWickets,
    oversCompleted,
    currentBalls,
    totalOversFormatted,
    crr,
    foursCount,
    sixesCount,
    totalBoundaries,
    boundaryRuns,
    boundaryPercentage,
    topBatters,
    topBowlers,
    targetEquationText,
    resultText,
  };
}
