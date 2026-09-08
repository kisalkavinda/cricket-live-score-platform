/**
 * COMPREHENSIVE MATCH ANALYTICS & INTERACTIVE FEATURES TEST SUITE
 * 
 * Verifies:
 * 1. Over-by-over aggregation (runs, cumulative runs, wickets, 6s, maidens, CRR)
 * 2. Comparative worm trajectory & Manhattan data models
 * 3. Dynamic Live Chase Equation & Required Run Rate (RRR) calculations
 * 4. Head-to-Head Boundary Counter for CPL Tournament Tie-Break Regulations
 * 5. Ball-by-Ball Timeline Filtering (All, Boundaries Only, Wickets Only)
 * 6. Visual Outcome Badges & Dynamic Commentary Generation
 */

import assert from 'assert';
import {
  computeInningsAnalytics,
  calculateChaseEquation,
  calculateBoundaryComparison,
  filterCommentaryBalls,
  generateBallDescription,
  getBallBadgeStyle,
  computeInningsSummary,
} from '../lib/analytics/match-analytics';
import { calculateDeliveryRuns } from '../lib/scoring/scoring-rules';

let passed = 0;
let failed = 0;

function logPass(name: string) {
  console.log(`  PASS  ${name}`);
  passed++;
}

function logFail(name: string, err: any) {
  console.error(`  FAIL  ${name}:`, err?.message || err);
  failed++;
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log(' MATCH ANALYTICS & INTERACTIVE FEATURES TEST SUITE');
  console.log('============================================================\n');

  // ===========================================================================
  // TEST GROUP 1: Over-by-Over Aggregation & Maiden Detection
  // ===========================================================================
  console.log('--- TEST GROUP 1: Over-by-Over Aggregation & Maiden Overs ---');
  try {
    const mockInnings = {
      id: 'inn-1',
      inningsNumber: 1,
      runs: 28,
      wickets: 1,
      overs: 3,
      balls: 0,
      battingTeam: { id: 'team-1', name: 'Thunderbolts', shortName: 'THU' },
      ballEvents: [
        // Over 0: 6 legal balls, 0 runs -> Maiden over!
        { overNumber: 0, ballNumber: 1, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:00:01Z' },
        { overNumber: 0, ballNumber: 2, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:00:30Z' },
        { overNumber: 0, ballNumber: 3, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:01:00Z' },
        { overNumber: 0, ballNumber: 4, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:01:30Z' },
        { overNumber: 0, ballNumber: 5, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:02:00Z' },
        { overNumber: 0, ballNumber: 6, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:02:30Z' },
        // Over 1: 4, 6, 1, 0, 4, Wicket -> 15 runs, 1 wicket, two 4s, one 6
        { overNumber: 1, ballNumber: 1, runs: 4, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:04:00Z' },
        { overNumber: 1, ballNumber: 2, runs: 6, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:04:30Z' },
        { overNumber: 1, ballNumber: 3, runs: 1, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:05:00Z' },
        { overNumber: 1, ballNumber: 4, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:05:30Z' },
        { overNumber: 1, ballNumber: 5, runs: 4, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:06:00Z' },
        { overNumber: 1, ballNumber: 6, runs: 0, extras: 0, isLegal: true, isWicket: true, wicketType: 'BOWLED', createdAt: '2026-09-06T10:06:30Z' },
        // Over 2: 1 wide (1 extra), 6, 2, 0, 0, 4, 0 -> 13 runs, one 6, one 4
        { overNumber: 2, ballNumber: 1, runs: 0, extras: 1, extraType: 'WIDE', isLegal: false, isWicket: false, createdAt: '2026-09-06T10:08:00Z' },
        { overNumber: 2, ballNumber: 1, runs: 6, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:08:30Z' },
        { overNumber: 2, ballNumber: 2, runs: 2, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:09:00Z' },
        { overNumber: 2, ballNumber: 3, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:09:30Z' },
        { overNumber: 2, ballNumber: 4, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:10:00Z' },
        { overNumber: 2, ballNumber: 5, runs: 4, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:10:30Z' },
        { overNumber: 2, ballNumber: 6, runs: 0, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:11:00Z' },
      ],
    };

    const analytics = computeInningsAnalytics(mockInnings, 6);

    // Over 1 verification
    const ov1 = analytics.overs[0];
    assert.strictEqual(ov1.overNumber, 1);
    assert.strictEqual(ov1.runsInOver, 0);
    assert.strictEqual(ov1.cumulativeRuns, 0);
    assert.strictEqual(ov1.isMaiden, true, 'Over 1 must be flagged as a Maiden over');
    assert.strictEqual(ov1.wicketsInOver, 0);

    // Over 2 verification
    const ov2 = analytics.overs[1];
    assert.strictEqual(ov2.overNumber, 2);
    assert.strictEqual(ov2.runsInOver, 15);
    assert.strictEqual(ov2.cumulativeRuns, 15);
    assert.strictEqual(ov2.wicketsInOver, 1);
    assert.strictEqual(ov2.cumulativeWickets, 1);
    assert.strictEqual(ov2.foursInOver, 2);
    assert.strictEqual(ov2.sixesInOver, 1);
    assert.strictEqual(ov2.isMaiden, false);

    // Over 3 verification
    const ov3 = analytics.overs[2];
    assert.strictEqual(ov3.overNumber, 3);
    assert.strictEqual(ov3.runsInOver, 13);
    assert.strictEqual(ov3.cumulativeRuns, 28);
    assert.strictEqual(ov3.sixesInOver, 1);
    assert.strictEqual(ov3.foursInOver, 1);

    // Aggregate boundary count & runs
    assert.strictEqual(analytics.foursCount, 3, 'Total 4s must be 3');
    assert.strictEqual(analytics.sixesCount, 2, 'Total 6s must be 2');
    assert.strictEqual(analytics.totalBoundaries, 5, 'Total boundaries must be 5');
    assert.strictEqual(analytics.boundaryRuns, 3 * 4 + 2 * 6, 'Total boundary runs must be 24');

    logPass('1.1: Over-by-over aggregation accurately computes runs, wickets, 6s, and maiden overs');
  } catch (err) {
    logFail('1.1: Over-by-over aggregation test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 2: Comparative Worm & Trajectory Data Models
  // ===========================================================================
  console.log('\n--- TEST GROUP 2: Comparative Worm Trajectory Models ---');
  try {
    const mockInnings1 = {
      id: 'inn-1',
      inningsNumber: 1,
      runs: 45,
      wickets: 2,
      overs: 4,
      balls: 0,
      battingTeam: { name: 'Team Alpha', shortName: 'ALP' },
      ballEvents: [
        { overNumber: 0, ballNumber: 6, runs: 10, isLegal: true, createdAt: '2026-09-06T10:00:00Z' },
        { overNumber: 1, ballNumber: 6, runs: 12, isLegal: true, createdAt: '2026-09-06T10:05:00Z' },
        { overNumber: 2, ballNumber: 6, runs: 8, isLegal: true, createdAt: '2026-09-06T10:10:00Z' },
        { overNumber: 3, ballNumber: 6, runs: 15, isLegal: true, createdAt: '2026-09-06T10:15:00Z' },
      ],
    };

    const mockInnings2 = {
      id: 'inn-2',
      inningsNumber: 2,
      runs: 42,
      wickets: 1,
      overs: 3,
      balls: 0,
      battingTeam: { name: 'Team Beta', shortName: 'BET' },
      ballEvents: [
        { overNumber: 0, ballNumber: 6, runs: 14, isLegal: true, createdAt: '2026-09-06T11:00:00Z' },
        { overNumber: 1, ballNumber: 6, runs: 16, isLegal: true, createdAt: '2026-09-06T11:05:00Z' },
        { overNumber: 2, ballNumber: 6, runs: 12, isLegal: true, createdAt: '2026-09-06T11:10:00Z' },
      ],
    };

    const a1 = computeInningsAnalytics(mockInnings1, 6);
    const a2 = computeInningsAnalytics(mockInnings2, 6);

    // Worm trajectory comparison at Over 3:
    // Team 1 at Over 3: 10 + 12 + 8 = 30 runs
    // Team 2 at Over 3: 14 + 16 + 12 = 42 runs
    assert.strictEqual(a1.overs[2].cumulativeRuns, 30);
    assert.strictEqual(a2.overs[2].cumulativeRuns, 42);
    assert(a2.overs[2].cumulativeRuns > a1.overs[2].cumulativeRuns, 'Team Beta is ahead on the worm at Over 3');

    logPass('2.1: Comparative worm models correctly evaluate trajectory lead across innings');
  } catch (err) {
    logFail('2.1: Comparative worm models test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 3: Dynamic Live Chase Equation & Required Run Rate (RRR)
  // ===========================================================================
  console.log('\n--- TEST GROUP 3: Live Chase Equation & RRR Calculations ---');
  try {
    const mockMatch = {
      oversPerInnings: 20,
      ballsPerOver: 6,
      innings: [
        {
          id: 'inn-1',
          inningsNumber: 1,
          runs: 160,
          wickets: 5,
          overs: 20,
          balls: 0,
          battingTeam: { name: 'Royal Strikers', shortName: 'RYS' },
        },
        {
          id: 'inn-2',
          inningsNumber: 2,
          runs: 138,
          wickets: 4,
          overs: 17,
          balls: 4, // 17.4 overs bowled
          battingTeam: { name: 'Gladiators', shortName: 'GLA' },
        },
      ],
    };

    const chase = calculateChaseEquation(mockMatch, 6);
    assert.notStrictEqual(chase, null);

    // Target = 160 + 1 = 161
    assert.strictEqual(chase!.targetRuns, 161);
    // Runs needed = 161 - 138 = 23 runs
    assert.strictEqual(chase!.runsNeeded, 23);
    // Balls bowled = 17 * 6 + 4 = 106. Total balls = 20 * 6 = 120. Balls remaining = 120 - 106 = 14 balls.
    assert.strictEqual(chase!.ballsRemaining, 14);
    assert.strictEqual(chase!.oversRemainingFormatted, '2.2');
    // RRR = 23 / (14 / 6) = 23 / 2.3333 = 9.857 -> 9.86
    assert.strictEqual(chase!.requiredRunRate, '9.86');
    // Wickets in hand = 10 - 4 = 6 wickets
    assert.strictEqual(chase!.wicketsInHand, 6);

    assert(chase!.equationText.includes('Need 23 runs in 14 balls'), 'Equation text must state exact runs and balls');
    assert(chase!.equationText.includes('RRR: 9.86'), 'Equation text must state RRR');

    logPass('3.1: Live chase equation accurately calculates Target, Runs Needed, Balls Remaining, and RRR');
  } catch (err) {
    logFail('3.1: Live chase equation test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 4: Head-to-Head Boundary Counter (Tournament Tie-Break)
  // ===========================================================================
  console.log('\n--- TEST GROUP 4: Boundary Counter & Tournament Tiebreaker ---');
  try {
    const mockTieMatch = {
      teamA: { name: 'Team Knights', shortName: 'KNT' },
      teamB: { name: 'Team Warriors', shortName: 'WAR' },
      innings: [
        {
          inningsNumber: 1,
          runs: 150,
          battingTeam: { name: 'Team Knights', shortName: 'KNT' },
          ballEvents: [
            // Knights hit 12 fours and 5 sixes = 17 boundaries
            ...Array.from({ length: 12 }, () => ({ runs: 4, extras: 0, isLegal: true })),
            ...Array.from({ length: 5 }, () => ({ runs: 6, extras: 0, isLegal: true })),
          ],
        },
        {
          inningsNumber: 2,
          runs: 150,
          battingTeam: { name: 'Team Warriors', shortName: 'WAR' },
          ballEvents: [
            // Warriors hit 14 fours and 4 sixes = 18 boundaries
            ...Array.from({ length: 14 }, () => ({ runs: 4, extras: 0, isLegal: true })),
            ...Array.from({ length: 4 }, () => ({ runs: 6, extras: 0, isLegal: true })),
          ],
        },
      ],
    };

    const comparison = calculateBoundaryComparison(mockTieMatch);
    assert.notStrictEqual(comparison, null);

    assert.strictEqual(comparison!.teamA.fours, 12);
    assert.strictEqual(comparison!.teamA.sixes, 5);
    assert.strictEqual(comparison!.teamA.totalBoundaries, 17);
    assert.strictEqual(comparison!.teamA.boundaryRuns, 12 * 4 + 5 * 6); // 78

    assert.strictEqual(comparison!.teamB.fours, 14);
    assert.strictEqual(comparison!.teamB.sixes, 4);
    assert.strictEqual(comparison!.teamB.totalBoundaries, 18);
    assert.strictEqual(comparison!.teamB.boundaryRuns, 14 * 4 + 4 * 6); // 80

    // Warriors lead by 1 boundary
    assert.strictEqual(comparison!.leader, 'TEAM_B');
    assert.strictEqual(comparison!.leadDifference, 1);
    assert(comparison!.regulationRuleNote.includes('CPL Tournament Regulations'), 'Includes official tiebreak rule citation');

    logPass('4.1: Head-to-Head boundary counter accurately evaluates 4s, 6s, and tiebreak winner');
  } catch (err) {
    logFail('4.1: Head-to-head boundary counter test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 5: Ball-by-Ball Timeline Filtering (All, Boundaries, Wickets)
  // ===========================================================================
  console.log('\n--- TEST GROUP 5: Ball-by-Ball Timeline Filtering ---');
  try {
    const rawBalls = [
      { id: 'b1', overNumber: 0, ballNumber: 1, runs: 0, isLegal: true, isWicket: false, batsman: { name: 'Batter 1' }, bowler: { name: 'Bowler 1' } },
      { id: 'b2', overNumber: 0, ballNumber: 2, runs: 4, isLegal: true, isWicket: false, batsman: { name: 'Batter 1' }, bowler: { name: 'Bowler 1' } },
      { id: 'b3', overNumber: 0, ballNumber: 3, runs: 1, isLegal: true, isWicket: false, batsman: { name: 'Batter 1' }, bowler: { name: 'Bowler 1' } },
      { id: 'b4', overNumber: 0, ballNumber: 4, runs: 6, isLegal: true, isWicket: false, batsman: { name: 'Batter 2' }, bowler: { name: 'Bowler 1' } },
      { id: 'b5', overNumber: 0, ballNumber: 5, runs: 0, isLegal: true, isWicket: true, wicketType: 'CAUGHT', batsman: { name: 'Batter 2' }, bowler: { name: 'Bowler 1' } },
      { id: 'b6', overNumber: 0, ballNumber: 6, runs: 2, isLegal: true, isWicket: false, batsman: { name: 'Batter 3' }, bowler: { name: 'Bowler 1' } },
    ];

    // Filter ALL
    const allFiltered = filterCommentaryBalls(rawBalls, 'ALL');
    assert.strictEqual(allFiltered.length, 6, 'ALL filter must return all 6 balls');

    // Filter BOUNDARIES (only 4s and 6s)
    const boundariesFiltered = filterCommentaryBalls(rawBalls, 'BOUNDARIES');
    assert.strictEqual(boundariesFiltered.length, 2, 'BOUNDARIES filter must return exactly 2 balls');
    assert(boundariesFiltered.some(b => b.runs === 4));
    assert(boundariesFiltered.some(b => b.runs === 6));

    // Filter WICKETS (only wickets)
    const wicketsFiltered = filterCommentaryBalls(rawBalls, 'WICKETS');
    assert.strictEqual(wicketsFiltered.length, 1, 'WICKETS filter must return exactly 1 ball');
    assert.strictEqual(wicketsFiltered[0].isWicket, true);
    assert.strictEqual(wicketsFiltered[0].wicketType, 'CAUGHT');

    logPass('5.1: Commentary timeline filtering accurately extracts Boundaries and Wickets subsets');
  } catch (err) {
    logFail('5.1: Commentary timeline filtering test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 6: Visual Badges & Dynamic Commentary Generation
  // ===========================================================================
  console.log('\n--- TEST GROUP 6: Visual Badges & Commentary Text ---');
  try {
    // 1. Four badge
    const badge4 = getBallBadgeStyle({ runs: 4, isWicket: false });
    assert.strictEqual(badge4.type, 'FOUR');
    assert.strictEqual(badge4.label, '4');
    assert.strictEqual(badge4.bg, '#10B981', 'FOUR must have Emerald Green background');

    // 2. Six badge
    const badge6 = getBallBadgeStyle({ runs: 6, isWicket: false });
    assert.strictEqual(badge6.type, 'SIX');
    assert.strictEqual(badge6.label, '6');
    assert.strictEqual(badge6.bg, '#8B5CF6', 'SIX must have Electric Purple background');

    // 3. Wicket badge
    const badgeW = getBallBadgeStyle({ runs: 0, isWicket: true });
    assert.strictEqual(badgeW.type, 'WICKET');
    assert.strictEqual(badgeW.label, 'W');
    assert.strictEqual(badgeW.bg, '#EF4444', 'Wicket must have Ruby Red background');

    // 3b. Completed runs + Wicket badge (e.g. 1 run taken, run out on 2nd)
    const badge1W = getBallBadgeStyle({ runs: 1, isWicket: true });
    assert.strictEqual(badge1W.type, 'WICKET');
    assert.strictEqual(badge1W.label, '1+W');
    assert.strictEqual(badge1W.bg, '#EF4444');

    const badge2W = getBallBadgeStyle({ runs: 2, isWicket: true });
    assert.strictEqual(badge2W.type, 'WICKET');
    assert.strictEqual(badge2W.label, '2+W');

    // 4. Dynamic description generation
    const descBowled = generateBallDescription({
      isWicket: true,
      wicketType: 'BOWLED',
      batsman: { name: 'Kusal Perera' },
      bowler: { name: 'Lasith Malinga' },
    });
    assert(descBowled.includes('OUT! Bowled him!'), 'Description must describe bowled wicket');

    const descSix = generateBallDescription({
      runs: 6,
      batsman: { name: 'Sanath Jayasuriya' },
      bowler: { name: 'Shoaib Akhtar' },
    });
    assert(descSix.includes('SIX!'), 'Description must describe a six');

    const descRunOut = generateBallDescription({
      runs: 1,
      isWicket: true,
      wicketType: 'RUN_OUT',
      batsman: { name: 'Pathum Nissanka' },
      dismissedPlayer: { name: 'Charith Asalanka' },
      bowler: { name: 'Shaheen Afridi' },
    });
    assert(descRunOut.includes('OUT! RUN OUT!') && descRunOut.includes('1 run'), 'Description must describe completed run before run out');

    logPass('6.1: Visual badges and dynamic commentary descriptions render with exact hallmarks');
  } catch (err) {
    logFail('6.1: Visual badges test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 7: No-Ball Free Hits, Super Overs & Innings Summary
  // ===========================================================================
  console.log('\n--- TEST GROUP 7: No-Ball Free Hits, Super Overs & Innings Summary ---');
  try {
    // 1. No-ball commentary (Tournament Rule: No Free Hit after No-ball)
    const nbSix = generateBallDescription({
      extraType: 'NO_BALL',
      runs: 6,
      batsman: { name: 'Wanindu Hasaranga' },
      bowler: { name: 'Mitchell Starc' },
    });
    assert(nbSix.includes('NO BALL & SIX'), 'No ball with six must include NO BALL & SIX');
    assert(!nbSix.includes('FREE HIT'), 'Tournament rules: No Free Hit awarded after No-ball');

    const nbFour = generateBallDescription({
      extraType: 'NO_BALL',
      runs: 4,
      batsman: { name: 'Wanindu Hasaranga' },
      bowler: { name: 'Mitchell Starc' },
    });
    assert(nbFour.includes('NO BALL & FOUR'), 'No ball with four must include NO BALL & FOUR');

    // 2. Legacy commentary sanitization (Tournament Rule: Free Hits purged from commentary)
    const sanitizedLegacyCommentary = generateBallDescription({
      commentary: 'NO BALL (Above Chest Height) & SIX! 7 runs added (+1 run & extra delivery, no free hit under CPL rules).',
      runs: 6,
      batsman: { name: 'Dasun Shanaka' },
      bowler: { name: 'Shaheen Afridi' },
    });
    assert(!sanitizedLegacyCommentary.toUpperCase().includes('FREE HIT'), 'Sanitizer must remove all free hit text from legacy commentary');

    const sanitizedFhSurvival = generateBallDescription({
      commentary: 'FREE HIT SURVIVAL! NOT OUT! Mitchell Starc shatters the stumps, but it is a FREE HIT!',
      runs: 0,
      batsman: { name: 'Dasun Shanaka' },
      bowler: { name: 'Mitchell Starc' },
    });
    assert(!sanitizedFhSurvival.toUpperCase().includes('FREE HIT'), 'Sanitizer must not output Free Hit on fallback');

    // 3. Super Over commentary
    const soWkt = generateBallDescription({
      isSuperOver: true,
      isWicket: true,
      wicketType: 'CAUGHT',
      dismissedPlayer: { name: 'Pathum Nissanka' },
      batsman: { name: 'Pathum Nissanka' },
      bowler: { name: 'Jasprit Bumrah' },
    });
    assert(soWkt.includes('SUPER OVER'), 'Super over wicket must mention Super Over');

    // 4. Sequential No-ball delivery detection via filterCommentaryBalls
    const rawDeliverySequence = [
      // Ball 1: No ball -> under tournament rules, next ball is NOT a Free Hit
      { id: 'b-1', overNumber: 0, ballNumber: 1, runs: 0, extras: 1, extraType: 'NO_BALL', isLegal: false, isWicket: false, createdAt: '2026-09-06T10:00:00Z' },
      // Ball 2: Bowled after No-ball (valid delivery, not Free Hit)
      { id: 'b-2', overNumber: 0, ballNumber: 1, runs: 6, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:00:30Z' },
      // Ball 3: Normal delivery
      { id: 'b-3', overNumber: 0, ballNumber: 2, runs: 1, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-06T10:01:00Z' },
    ];

    const processedDeliveries = filterCommentaryBalls(rawDeliverySequence, 'ALL');
    const ball2 = processedDeliveries.find(d => d.id === 'b-2');
    const ball3 = processedDeliveries.find(d => d.id === 'b-3');
    assert.strictEqual(ball2?.isFreeHit, false, 'Under tournament rules, delivery following No-Ball must not be Free Hit');
    assert.strictEqual(ball3?.isFreeHit, false, 'Delivery following legal delivery must not be Free Hit');

    // 5. Innings Summary calculation
    const mockInnSummary = computeInningsSummary({
      inningsNumber: 1,
      runs: 185,
      wickets: 4,
      overs: 20,
      balls: 0,
      battingTeam: { name: 'Sri Lanka', shortName: 'SL' },
      ballEvents: rawDeliverySequence,
    });
    assert.strictEqual(mockInnSummary.totalRuns, 185);
    assert.strictEqual(mockInnSummary.totalWickets, 4);
    assert.strictEqual(mockInnSummary.crr, '9.25');
    assert(mockInnSummary.targetEquationText?.includes('186 runs to win'), 'Target must be 186 runs');

    // 6. Super Over Innings Summary calculation
    const mockSuperOverSummary = computeInningsSummary({
      inningsNumber: 3,
      isSuperOver: true,
      runs: 16,
      wickets: 1,
      overs: 1,
      balls: 0,
      battingTeam: { name: 'Australia', shortName: 'AUS' },
      ballEvents: rawDeliverySequence,
    });
    assert.strictEqual(mockSuperOverSummary.isSuperOver, true);
    assert.strictEqual(mockSuperOverSummary.totalRuns, 16);
    assert(mockSuperOverSummary.targetEquationText?.includes('17 runs to win'), 'Super over target must be 17 runs');

    // 7. Wide ball boundary (5 wides) and running extras calculation (MCC Law 22)
    const wide5 = calculateDeliveryRuns({ extraType: 'WIDE', extras: 5 });
    assert.strictEqual(wide5.totalRuns, 5, 'Boundary wide must yield 5 total runs');
    assert.strictEqual(wide5.wideRuns, 5, 'Boundary wide must record 5 wide extras');
    assert.strictEqual(wide5.bowlerRuns, 5, 'Bowler must be charged 5 runs for boundary wide');
    assert.strictEqual(wide5.isLegal, false, 'Wide ball is not a legal delivery and must be re-bowled');

    const wide2 = calculateDeliveryRuns({ extraType: 'WIDE', extras: 2 });
    assert.strictEqual(wide2.totalRuns, 2, 'Wide + 1 run must yield 2 total runs');
    assert.strictEqual(wide2.wideRuns, 2, 'Wide + 1 run must record 2 wide extras');

    const descWide5 = generateBallDescription({
      extraType: 'WIDE',
      extras: 5,
      batsman: { name: 'Pathum Nissanka' },
      bowler: { name: 'Mitchell Starc' },
    });
    assert(descWide5.includes('5 WIDES!'), '5 Wides commentary must describe boundary 5 wides');

    const descWide2 = generateBallDescription({
      extraType: 'WIDE',
      extras: 2,
      batsman: { name: 'Pathum Nissanka' },
      bowler: { name: 'Mitchell Starc' },
    });
    assert(descWide2.includes('WIDE + 1 RUN'), 'Wide with 1 extra run must describe running extras');

    logPass('7.1: No-ball free hits, super overs, wide boundary (5 WDs), and innings summary calculations are verified');
  } catch (err) {
    logFail('7.1: No-ball and Super Over test failed', err);
  }

  // ===========================================================================
  // TEST GROUP 8: Match Prioritization Sorting in All Matches Tab
  // ===========================================================================
  console.log('--- TEST GROUP 8: Match Prioritization Sorting ---');
  try {
    const { sortMatchesByPriority } = await import('../lib/scoring/scoring-rules');

    const sampleMatches = [
      { id: 'm-upcoming-far', status: 'UPCOMING', scheduledAt: '2026-09-10T14:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'm-completed-old', status: 'COMPLETED', completedAt: '2026-09-05T12:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'm-live-2', status: 'LIVE', startedAt: '2026-09-08T10:30:00Z', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'm-completed-recent', status: 'COMPLETED', completedAt: '2026-09-08T09:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'm-live-1', status: 'LIVE', startedAt: '2026-09-08T11:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'm-upcoming-soon', status: 'UPCOMING', scheduledAt: '2026-09-09T10:00:00Z', createdAt: '2026-09-01T00:00:00Z' },
    ];

    const sorted = sortMatchesByPriority(sampleMatches);
    const sortedIds = sorted.map((m) => m.id);

    // Expected order:
    // 1. LIVE matches: m-live-1 (11:00) then m-live-2 (10:30)
    // 2. COMPLETED matches (recent to past): m-completed-recent (Sep 8) then m-completed-old (Sep 5)
    // 3. UPCOMING matches (soonest first): m-upcoming-soon (Sep 9) then m-upcoming-far (Sep 10)
    assert.strictEqual(sortedIds[0], 'm-live-1', 'Most recent LIVE match must come 1st');
    assert.strictEqual(sortedIds[1], 'm-live-2', 'Earlier LIVE match must come 2nd');
    assert.strictEqual(sortedIds[2], 'm-completed-recent', 'Most recent COMPLETED match must come 3rd');
    assert.strictEqual(sortedIds[3], 'm-completed-old', 'Older COMPLETED match must come 4th');
    assert.strictEqual(sortedIds[4], 'm-upcoming-soon', 'Soonest UPCOMING match must come 5th');
    assert.strictEqual(sortedIds[5], 'm-upcoming-far', 'Later UPCOMING match must come 6th');

    logPass('8.1: Match sorting correctly prioritizes LIVE -> COMPLETED (recent to past) -> UPCOMING/SCHEDULED last');
  } catch (err) {
    logFail('8.1: Match prioritization test failed', err);
  }

  console.log('\n============================================================');
  console.log(` MATCH ANALYTICS RESULTS: ${passed} passed | ${failed} failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
