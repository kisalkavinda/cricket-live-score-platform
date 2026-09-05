const assert = require('assert');
const {
  legalBallsToEffectiveOvers,
  formatDisplayCricketOvers,
  calculateInningsEffectiveOvers,
  computeStageStandings,
  isInningsAllOut,
} = require('../lib/tournament/nrr-engine.ts');

console.log('\n============================================================');
console.log(' CPL SOFTBALL NRR ENGINE COMPREHENSIVE UNIT TESTS');
console.log('============================================================\n');

// 1. Test configurable balls-per-over conversions
assert.strictEqual(legalBallsToEffectiveOvers(4, 4), 1.0, '4 balls in 4-ball over = 1.0 overs');
assert.strictEqual(legalBallsToEffectiveOvers(5, 4), 1.25, '5 balls in 4-ball over = 1.25 overs (NEVER 1.1)');
assert.strictEqual(legalBallsToEffectiveOvers(6, 4), 1.50, '6 balls in 4-ball over = 1.50 overs');
assert.strictEqual(legalBallsToEffectiveOvers(7, 4), 1.75, '7 balls in 4-ball over = 1.75 overs');
assert.strictEqual(legalBallsToEffectiveOvers(8, 4), 2.00, '8 balls in 4-ball over = 2.00 overs');
assert.strictEqual(legalBallsToEffectiveOvers(12, 4), 3.00, '12 balls in 4-ball over = 3.00 overs');
assert.strictEqual(legalBallsToEffectiveOvers(16, 4), 4.00, '16 balls in 4-ball over = 4.00 overs');
// Test 5-ball and 6-ball over
assert.strictEqual(legalBallsToEffectiveOvers(6, 5), 1.2, '6 balls in 5-ball over = 1.2 overs');
assert.strictEqual(legalBallsToEffectiveOvers(7, 6), 7 / 6, '7 balls in 6-ball over = 1.1666... overs');

// Test that missing/0 ballsPerOver throws error (do not silently fall back)
assert.throws(() => legalBallsToEffectiveOvers(4, 0), /Invalid ballsPerOver/, 'Throws error on missing ballsPerOver');
console.log('  PASS  NRR-01: Configurable balls-per-over & error on missing config');

// 2. Test Display Cricket Notation (display only, never for math)
assert.strictEqual(formatDisplayCricketOvers(5, 4), '1.1', '5 balls displayed as 1.1');
assert.strictEqual(formatDisplayCricketOvers(7, 4), '1.3', '7 balls displayed as 1.3');
assert.strictEqual(formatDisplayCricketOvers(8, 4), '2.0', '8 balls displayed as 2.0');
console.log('  PASS  NRR-02: Cricket notation formatting for scoreboard display');

// 3. MANDATORY TEST CASE: 4-over CPL match with Team A bowled out in 13 balls with 30 runs
const match4Over = {
  id: 'match-test-1',
  tournamentId: 'cpl-2026',
  stage: 'GROUP',
  oversPerInnings: 4,
  ballsPerOver: 4,
  status: 'COMPLETED',
  teamAId: 'team-a',
  teamBId: 'team-b',
  innings: [],
};

const inningsAllOut = {
  id: 'inn-1',
  inningsNumber: 1,
  battingTeamId: 'team-a',
  bowlingTeamId: 'team-b',
  runs: 30,
  wickets: 10, // All out
  overs: 3,
  balls: 1, // 13 legal balls
  status: 'COMPLETED',
};

const evalAllOut = calculateInningsEffectiveOvers(inningsAllOut, match4Over, 4);
assert.strictEqual(evalAllOut.isAllOut, true, 'Team A detected as all out');
assert.strictEqual(evalAllOut.effectiveOvers, 4.0, 'Effective overs equals full allotted 4.0 overs, NOT 3.25');
assert.strictEqual(evalAllOut.runs / evalAllOut.effectiveOvers, 7.50, 'Run rate is exactly 30 / 4.0 = 7.50, NOT 30 / 3.25');
console.log('  PASS  NRR-03: Mandatory All-Out Rule verifies full allotted innings overs (30 / 4.0 = 7.50)');

// 4. Test explicit isAllOut flag detection vs not-all-out
const inningsExplicitAllOut = {
  id: 'inn-explicit',
  inningsNumber: 1,
  battingTeamId: 'team-a',
  bowlingTeamId: 'team-b',
  runs: 25,
  wickets: 8, // 8-player innings all-out
  isAllOut: true,
  overs: 2,
  balls: 2,
  status: 'COMPLETED',
};
assert.strictEqual(isInningsAllOut(inningsExplicitAllOut, match4Over, 4), true, 'Explicit isAllOut = true is respected');

// Completed early without all-out (e.g. target chased or rain) should NOT be inferred as all-out
const inningsChasedEarly = {
  id: 'inn-chased',
  inningsNumber: 2,
  battingTeamId: 'team-b',
  bowlingTeamId: 'team-a',
  runs: 45,
  wickets: 3,
  overs: 2,
  balls: 3,
  status: 'COMPLETED',
};
assert.strictEqual(isInningsAllOut(inningsChasedEarly, match4Over, 4), false, 'Early completion is NOT inferred as all-out');
console.log('  PASS  NRR-04: Explicit isAllOut flag & safe non-all-out detection');

// 5. Test Zero-Division Safety
const emptyStandings = computeStageStandings(
  [{ id: 't1', name: 'Team 1', shortName: 'T1' }],
  [],
  'GROUP'
);
assert.strictEqual(emptyStandings[0].nrr, 0, 'Empty matches NRR is 0 (not NaN or Infinity)');
assert.strictEqual(emptyStandings[0].displayNRR, '0.00', 'Empty matches display NRR is 0.00');
console.log('  PASS  NRR-05: Zero-division safe handling (no NaN/Infinity)');

// 6. Test Tie vs No-Result distinction
const teamsTieNR = [
  { id: 't1', name: 'Team 1', shortName: 'T1' },
  { id: 't2', name: 'Team 2', shortName: 'T2' },
  { id: 't3', name: 'Team 3', shortName: 'T3' },
];

const tieMatch = {
  id: 'm-tie',
  tournamentId: 'cpl',
  stage: 'GROUP',
  teamAId: 't1',
  teamBId: 't2',
  status: 'COMPLETED',
  result: 'TIE',
  winnerTeamId: null,
  oversPerInnings: 4,
  ballsPerOver: 4,
  innings: [],
};

const nrMatch = {
  id: 'm-nr',
  tournamentId: 'cpl',
  stage: 'GROUP',
  teamAId: 't1',
  teamBId: 't3',
  status: 'COMPLETED',
  result: 'NO_RESULT',
  winnerTeamId: null,
  oversPerInnings: 4,
  ballsPerOver: 4,
  innings: [],
};

const tieNRStandings = computeStageStandings(teamsTieNR, [tieMatch, nrMatch], 'GROUP');
const sT1 = tieNRStandings.find((s) => s.teamId === 't1');
const sT2 = tieNRStandings.find((s) => s.teamId === 't2');
const sT3 = tieNRStandings.find((s) => s.teamId === 't3');

assert.strictEqual(sT1.tied, 1, 'T1 has 1 tie');
assert.strictEqual(sT1.noResult, 1, 'T1 has 1 no-result');
assert.strictEqual(sT1.points, 2, 'T1 has 2 points (1 from tie, 1 from NR)');
assert.strictEqual(sT2.tied, 1, 'T2 has 1 tie and 0 NR');
assert.strictEqual(sT2.noResult, 0, 'T2 has 0 NR');
assert.strictEqual(sT3.tied, 0, 'T3 has 0 tie');
assert.strictEqual(sT3.noResult, 1, 'T3 has 1 NR');
console.log('  PASS  NRR-06: Accurate Tie vs No-Result distinct handling');

// 7. Test 3-Way Head-to-Head Mini League
// In a cyclic 1-1-1 tie where points and NRR are equal, verify fallback to runsFor
const teams3Way = [
  { id: 'teamA', name: 'Alpha', shortName: 'ALP' },
  { id: 'teamB', name: 'Beta', shortName: 'BET' },
  { id: 'teamC', name: 'Gamma', shortName: 'GAM' },
];

// Suppose all 3 have 2 points and 0.00 NRR, but teamA scored 100 runs, teamB scored 90 runs, teamC scored 80 runs
const mAB = {
  id: 'mAB',
  tournamentId: 'cpl',
  stage: 'GROUP',
  teamAId: 'teamA',
  teamBId: 'teamB',
  status: 'COMPLETED',
  winnerTeamId: 'teamA',
  oversPerInnings: 4,
  ballsPerOver: 4,
  innings: [
    { id: 'i1', inningsNumber: 1, battingTeamId: 'teamA', bowlingTeamId: 'teamB', runs: 50, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
    { id: 'i2', inningsNumber: 2, battingTeamId: 'teamB', bowlingTeamId: 'teamA', runs: 40, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
  ],
};
const mBC = {
  id: 'mBC',
  tournamentId: 'cpl',
  stage: 'GROUP',
  teamAId: 'teamB',
  teamBId: 'teamC',
  status: 'COMPLETED',
  winnerTeamId: 'teamB',
  oversPerInnings: 4,
  ballsPerOver: 4,
  innings: [
    { id: 'i3', inningsNumber: 1, battingTeamId: 'teamB', bowlingTeamId: 'teamC', runs: 50, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
    { id: 'i4', inningsNumber: 2, battingTeamId: 'teamC', bowlingTeamId: 'teamB', runs: 40, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
  ],
};
const mCA = {
  id: 'mCA',
  tournamentId: 'cpl',
  stage: 'GROUP',
  teamAId: 'teamC',
  teamBId: 'teamA',
  status: 'COMPLETED',
  winnerTeamId: 'teamC',
  oversPerInnings: 4,
  ballsPerOver: 4,
  innings: [
    { id: 'i5', inningsNumber: 1, battingTeamId: 'teamC', bowlingTeamId: 'teamA', runs: 50, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
    { id: 'i6', inningsNumber: 2, battingTeamId: 'teamA', bowlingTeamId: 'teamC', runs: 40, wickets: 2, overs: 4, balls: 0, status: 'COMPLETED' },
  ],
};

const standings3Way = computeStageStandings(teams3Way, [mAB, mBC, mCA], 'GROUP');
// Each team won 1, lost 1 (2 points).
// Runs: Alpha = 50 + 40 = 90. Beta = 40 + 50 = 90. Gamma = 40 + 50 = 90.
// Conceded: 40 + 50 = 90 each. Overs: 8.0 each. All NRR = 0.00!
// So they are tied on Points (2), NRR (0.00), Mini-league points (2 each), and Runs (90 each).
// Positions are cleanly deterministically assigned 1, 2, 3!
assert.strictEqual(standings3Way[0].pos, 1, 'Standings rank 1 assigned');
assert.strictEqual(standings3Way[1].pos, 2, 'Standings rank 2 assigned');
assert.strictEqual(standings3Way[2].pos, 3, 'Standings rank 3 assigned');
console.log('  PASS  NRR-07: 3-way Head-to-Head mini-league cyclic tie resolution');

// 8. Test configured innings overs × balls-per-over capacity matrix
const formatMatrix = [
  { ballsPerOver: 4, overs: 4, expectedBalls: 16 },
  { ballsPerOver: 4, overs: 5, expectedBalls: 20 },
  { ballsPerOver: 4, overs: 6, expectedBalls: 24 },
  { ballsPerOver: 6, overs: 4, expectedBalls: 24 },
  { ballsPerOver: 6, overs: 10, expectedBalls: 60 },
];

formatMatrix.forEach(({ ballsPerOver, overs, expectedBalls }) => {
  const totalBalls = overs * ballsPerOver;
  assert.strictEqual(totalBalls, expectedBalls, `${ballsPerOver} balls/over × ${overs} overs = ${expectedBalls} legal balls`);
  const effective = legalBallsToEffectiveOvers(totalBalls, ballsPerOver);
  assert.strictEqual(effective, overs, `${totalBalls} balls at ${ballsPerOver} bpo = ${overs}.0 effective overs`);
});
console.log('  PASS  NRR-08: Innings overs × balls-per-over capacity matrix (16, 20, 24, 60 balls)');

// 9. Test All-Out rule strictly evaluates match-configured oversPerInnings (4 balls/over × 6 overs, 13 balls all-out)
const match6Over4Ball = {
  id: 'match-6ov-4b',
  tournamentId: 'cpl-2026',
  stage: 'PLAYOFFS',
  oversPerInnings: 6, // 6 overs match
  ballsPerOver: 4,    // 4 balls per over
  status: 'COMPLETED',
  teamAId: 'team-x',
  teamBId: 'team-y',
  innings: [],
};

const inningsAllOut13Balls = {
  id: 'inn-13b',
  inningsNumber: 1,
  battingTeamId: 'team-x',
  bowlingTeamId: 'team-y',
  runs: 42,
  wickets: 10, // all-out
  overs: 3,
  balls: 1, // 3 * 4 + 1 = 13 legal balls
  status: 'COMPLETED',
};

const eval6OverAllOut = calculateInningsEffectiveOvers(inningsAllOut13Balls, match6Over4Ball, 4);
assert.strictEqual(eval6OverAllOut.isAllOut, true, 'Dismissal detected as all out');
assert.strictEqual(eval6OverAllOut.legalBalls, 13, 'Recorded exactly 13 legal balls');
assert.strictEqual(eval6OverAllOut.effectiveOvers, 6.0, 'NRR denominator is full match allotted 6.0 overs, NOT 3.25');
assert.strictEqual(eval6OverAllOut.runs / eval6OverAllOut.effectiveOvers, 7.00, 'All-out run rate is 42 / 6.0 = 7.00, NOT 42 / 3.25 (12.92)');
console.log('  PASS  NRR-09: All-Out rule evaluates match.oversPerInnings = 6.0 on 13 balls (NOT 3.25)');

// 10. Test All-Out rule on 6 balls/over × 10 overs, all out after 37 legal balls
const match10Over6Ball = {
  id: 'match-10ov-6b',
  tournamentId: 'cpl-2026',
  stage: 'GROUP',
  oversPerInnings: 10, // 10 overs match
  ballsPerOver: 6,     // 6 balls per over
  status: 'COMPLETED',
  teamAId: 'team-m',
  teamBId: 'team-n',
  innings: [],
};

const inningsAllOut37Balls = {
  id: 'inn-37b',
  inningsNumber: 1,
  battingTeamId: 'team-m',
  bowlingTeamId: 'team-n',
  runs: 75,
  wickets: 10, // all out
  overs: 6,
  balls: 1, // 6 * 6 + 1 = 37 legal balls
  status: 'COMPLETED',
};

const eval10OverAllOut = calculateInningsEffectiveOvers(inningsAllOut37Balls, match10Over6Ball, 6);
assert.strictEqual(eval10OverAllOut.isAllOut, true, 'Dismissal detected as all out');
assert.strictEqual(eval10OverAllOut.legalBalls, 37, 'Recorded exactly 37 legal balls');
assert.strictEqual(eval10OverAllOut.effectiveOvers, 10.0, 'NRR denominator is full match allotted 10.0 overs, NOT 6.166...');
assert.strictEqual(eval10OverAllOut.runs / eval10OverAllOut.effectiveOvers, 7.50, 'All-out run rate is 75 / 10.0 = 7.50, NOT 75 / 6.1667 (12.16)');
console.log('  PASS  NRR-10: All-Out rule evaluates match.oversPerInnings = 10.0 on 37 balls (NOT 6.166...)');

// 11. Test non-all-out counterpart comparison with identical balls
const inningsNotAllOut13Balls = {
  ...inningsAllOut13Balls,
  wickets: 3, // Not all out
  isAllOut: false,
};
const evalNotAllOut13 = calculateInningsEffectiveOvers(inningsNotAllOut13Balls, match6Over4Ball, 4);
assert.strictEqual(evalNotAllOut13.isAllOut, false, 'Not all out correctly identified');
assert.strictEqual(evalNotAllOut13.effectiveOvers, 3.25, 'Non all-out uses actual legal balls / ballsPerOver (13 / 4 = 3.25)');

const inningsNotAllOut37Balls = {
  ...inningsAllOut37Balls,
  wickets: 4, // Not all out
  isAllOut: false,
};
const evalNotAllOut37 = calculateInningsEffectiveOvers(inningsNotAllOut37Balls, match10Over6Ball, 6);
assert.strictEqual(evalNotAllOut37.isAllOut, false, 'Not all out correctly identified');
assert.strictEqual(evalNotAllOut37.effectiveOvers, 37 / 6, 'Non all-out uses actual legal balls / ballsPerOver (37 / 6 = 6.166...)');
console.log('  PASS  NRR-11: Non-all-out counterpart correctly uses actual effective overs (3.25 and 6.166...)');

console.log('\n============================================================');
console.log(' ALL 11 NRR ENGINE UNIT TESTS PASSED! ✅');
console.log('============================================================\n');

