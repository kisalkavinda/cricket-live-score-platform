const assert = require('assert');
const {
  validateDismissalLegality,
  isBowlerCreditedDismissal,
  getInningsWicketLimit,
  isAuthoritativeAllOut,
  calculateDeliveryRuns,
  calculateBowlerRunsFromDelivery,
  calculateBowlerMaidens,
  calculateMaidensMap,
  BOWLER_CREDITED_WICKETS,
  isFreeHitActive,
} = require('../lib/scoring/scoring-rules.ts');

const {
  computeStageStandings,
  calculateInningsEffectiveOvers,
  isInningsAllOut,
} = require('../lib/tournament/nrr-engine.ts');

console.log('\n============================================================');
console.log(' MCC/ICC CRICKET SCORING RULES COMPREHENSIVE TEST SUITE');
console.log('============================================================\n');

// -------------------------------------------------------------
// 1. EXTRAS: Byes and Leg Byes (Pure Scoring Breakdown)
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: Extras (Byes & Leg Byes) ---');

// 1 Bye
const bye1 = calculateDeliveryRuns({ extraType: 'BYE', runs: 0, extras: 1, byeRuns: 1 });
assert.strictEqual(bye1.totalRuns, 1, '1 Bye: totalRuns must be 1');
assert.strictEqual(bye1.batterRuns, 0, '1 Bye: batterRuns must be 0');
assert.strictEqual(bye1.byeRuns, 1, '1 Bye: byeRuns must be 1');
assert.strictEqual(bye1.legByeRuns, 0, '1 Bye: legByeRuns must be 0');
assert.strictEqual(bye1.bowlerRuns, 0, '1 Bye: bowlerRuns must be 0 (not charged to bowler)');
assert.strictEqual(bye1.isLegal, true, '1 Bye is a legal delivery');
console.log('  PASS  1.1: 1 Bye -> batterRuns=0, byeRuns=1, totalRuns=1, bowlerRuns=0');

// 2 Byes
const bye2 = calculateDeliveryRuns({ extraType: 'BYE', runs: 0, extras: 2, byeRuns: 2 });
assert.strictEqual(bye2.totalRuns, 2, '2 Byes: totalRuns must be 2');
assert.strictEqual(bye2.batterRuns, 0, '2 Byes: batterRuns must be 0');
assert.strictEqual(bye2.byeRuns, 2, '2 Byes: byeRuns must be 2');
assert.strictEqual(bye2.bowlerRuns, 0, '2 Byes: bowlerRuns must be 0');
assert.strictEqual(bye2.isLegal, true, '2 Byes is a legal delivery');
console.log('  PASS  1.2: 2 Byes -> batterRuns=0, byeRuns=2, totalRuns=2, bowlerRuns=0');

// 1 Leg Bye
const lb1 = calculateDeliveryRuns({ extraType: 'LEG_BYE', runs: 0, extras: 1, legByeRuns: 1 });
assert.strictEqual(lb1.totalRuns, 1, '1 Leg Bye: totalRuns must be 1');
assert.strictEqual(lb1.batterRuns, 0, '1 Leg Bye: batterRuns must be 0');
assert.strictEqual(lb1.legByeRuns, 1, '1 Leg Bye: legByeRuns must be 1');
assert.strictEqual(lb1.byeRuns, 0, '1 Leg Bye: byeRuns must be 0');
assert.strictEqual(lb1.bowlerRuns, 0, '1 Leg Bye: bowlerRuns must be 0');
assert.strictEqual(lb1.isLegal, true, '1 Leg Bye is a legal delivery');
console.log('  PASS  1.3: 1 Leg Bye -> batterRuns=0, legByeRuns=1, totalRuns=1, bowlerRuns=0');

// 2 Leg Byes
const lb2 = calculateDeliveryRuns({ extraType: 'LEG_BYE', runs: 0, extras: 2, legByeRuns: 2 });
assert.strictEqual(lb2.totalRuns, 2, '2 Leg Byes: totalRuns must be 2');
assert.strictEqual(lb2.batterRuns, 0, '2 Leg Byes: batterRuns must be 0');
assert.strictEqual(lb2.legByeRuns, 2, '2 Leg Byes: legByeRuns must be 2');
assert.strictEqual(lb2.bowlerRuns, 0, '2 Leg Byes: bowlerRuns must be 0');
assert.strictEqual(lb2.isLegal, true, '2 Leg Byes is a legal delivery');
console.log('  PASS  1.4: 2 Leg Byes -> batterRuns=0, legByeRuns=2, totalRuns=2, bowlerRuns=0');


// -------------------------------------------------------------
// 2. NO-BALL COMBINATIONS (MCC Law 18.10.2 separation)
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 2: No-ball Combinations (MCC Law 18.10.2) ---');

// NB + bat 4
const nbBat4 = calculateDeliveryRuns({ extraType: 'NO_BALL', runs: 4, extras: 1 });
assert.strictEqual(nbBat4.totalRuns, 5, 'NB + bat 4: totalRuns must be 5');
assert.strictEqual(nbBat4.noBallPenalty, 1, 'NB + bat 4: noBallPenalty must be 1');
assert.strictEqual(nbBat4.batterRuns, 4, 'NB + bat 4: batterRuns must be 4');
assert.strictEqual(nbBat4.bowlerRuns, 5, 'NB + bat 4: bowlerRuns must be 5 (1 penalty + 4 bat)');
assert.strictEqual(nbBat4.isLegal, false, 'NB is not a legal delivery');
console.log('  PASS  2.1: NB + bat 4 -> teamRuns=5, noBallRuns=1, batterRuns=4, bowlerRuns=5, legal=false');

// NB + 2 Byes
const nbBye2 = calculateDeliveryRuns({ extraType: 'NO_BALL', runs: 0, extras: 1, byeRuns: 2 });
assert.strictEqual(nbBye2.totalRuns, 3, 'NB + 2 Byes: totalRuns must be 3');
assert.strictEqual(nbBye2.noBallPenalty, 1, 'NB + 2 Byes: noBallPenalty must be 1');
assert.strictEqual(nbBye2.byeRuns, 2, 'NB + 2 Byes: byeRuns must be 2');
assert.strictEqual(nbBye2.batterRuns, 0, 'NB + 2 Byes: batterRuns must be 0');
assert.strictEqual(nbBye2.bowlerRuns, 1, 'NB + 2 Byes: bowlerRuns must be 1 (only the penalty, NOT byes)');
assert.strictEqual(nbBye2.isLegal, false, 'NB + 2 Byes: isLegal must be false');
console.log('  PASS  2.2: NB + 2 Byes -> teamRuns=3, noBallRuns=1, byeRuns=2, batterRuns=0, bowlerRuns=1, legal=false');

// NB + 2 Leg Byes
const nbLb2 = calculateDeliveryRuns({ extraType: 'NO_BALL', runs: 0, extras: 1, legByeRuns: 2 });
assert.strictEqual(nbLb2.totalRuns, 3, 'NB + 2 Leg Byes: totalRuns must be 3');
assert.strictEqual(nbLb2.noBallPenalty, 1, 'NB + 2 Leg Byes: noBallPenalty must be 1');
assert.strictEqual(nbLb2.legByeRuns, 2, 'NB + 2 Leg Byes: legByeRuns must be 2');
assert.strictEqual(nbLb2.batterRuns, 0, 'NB + 2 Leg Byes: batterRuns must be 0');
assert.strictEqual(nbLb2.bowlerRuns, 1, 'NB + 2 Leg Byes: bowlerRuns must be 1 (only the penalty, NOT leg byes)');
assert.strictEqual(nbLb2.isLegal, false, 'NB + 2 Leg Byes: isLegal must be false');
console.log('  PASS  2.3: NB + 2 Leg Byes -> teamRuns=3, noBallRuns=1, legByeRuns=2, batterRuns=0, bowlerRuns=1, legal=false');


// -------------------------------------------------------------
// 3. SERVER-SIDE DISMISSAL LEGALITY: No-ball & Free Hit
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Dismissal Legality (No-ball & Free Hit) ---');

const allowedOnNbAndFh = ['RUN_OUT', 'HIT_BALL_TWICE', 'OBSTRUCTING_FIELD'];
const rejectedOnNbAndFh = [
  'BOWLED',
  'CAUGHT',
  'LBW',
  'STUMPED',
  'HIT_WICKET',
  'RETIRED_HURT',
  'RETIRED_OUT',
  'TIMED_OUT',
];

// Verify No-ball dismissals
allowedOnNbAndFh.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'NO_BALL', isFreeHit: false, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, true, `No-ball MUST allow ${wt}`);
});
console.log('  PASS  3.1: No-ball allows exactly RUN_OUT, HIT_BALL_TWICE, OBSTRUCTING_FIELD');

rejectedOnNbAndFh.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'NO_BALL', isFreeHit: false, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, false, `No-ball MUST reject ${wt}`);
  assert.ok(res.error, `Rejection of ${wt} must have descriptive error message`);
});
console.log('  PASS  3.2: No-ball rejects BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET, RETIRED_HURT, RETIRED_OUT, TIMED_OUT');

// Verify Free Hit dismissals (if flagged)
allowedOnNbAndFh.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'NONE', isFreeHit: true, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, true, `Free Hit MUST allow ${wt}`);
});
console.log('  PASS  3.3: Free Hit allows exactly RUN_OUT, HIT_BALL_TWICE, OBSTRUCTING_FIELD');

rejectedOnNbAndFh.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'NONE', isFreeHit: true, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, false, `Free Hit MUST reject ${wt}`);
  assert.ok(res.error, `Rejection of ${wt} on Free Hit must have descriptive error message`);
});
console.log('  PASS  3.4: Free Hit rejects BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET, RETIRED_HURT, RETIRED_OUT, TIMED_OUT');

// Verify Tournament Rule: No Free Hit after No-ball, delivery following No-ball allows ALL wickets
const noBallHistory = [{ extraType: 'NO_BALL', isLegal: false, createdAt: new Date() }];
const freeHitActive = isFreeHitActive(noBallHistory);
assert.strictEqual(freeHitActive, false, 'Under tournament rules, delivery after No-ball must NOT be a Free Hit');

const standardWicketsAfterNb = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET', 'RUN_OUT'];
standardWicketsAfterNb.forEach((wt) => {
  const res = validateDismissalLegality({
    extraType: 'NONE',
    isFreeHit: freeHitActive,
    isWicket: true,
    wicketType: wt,
  });
  assert.strictEqual(res.valid, true, `Delivery following No-ball MUST allow valid dismissal: ${wt}`);
});
console.log('  PASS  3.5: No Free Hit after No-ball; all wickets (BOWLED, CAUGHT, LBW, STUMPED, etc.) are valid');


// -------------------------------------------------------------
// 4. SERVER-SIDE DISMISSAL LEGALITY: Wide Deliveries
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Wide Delivery Dismissal Legality ---');

const rejectedOnWide = ['BOWLED', 'CAUGHT', 'LBW'];
const allowedOnWide = ['RUN_OUT', 'STUMPED', 'HIT_WICKET', 'OBSTRUCTING_FIELD'];

rejectedOnWide.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'WIDE', isFreeHit: false, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, false, `Wide MUST reject ${wt}`);
  assert.ok(res.error, `Rejection of ${wt} on Wide must have error message`);
});
console.log('  PASS  4.1: Wide rejects BOWLED, CAUGHT, LBW');

allowedOnWide.forEach((wt) => {
  const res = validateDismissalLegality({ extraType: 'WIDE', isFreeHit: false, isWicket: true, wicketType: wt });
  assert.strictEqual(res.valid, true, `Wide allows legal dismissal ${wt}`);
});
console.log('  PASS  4.2: Wide allows RUN_OUT, STUMPED, HIT_WICKET, OBSTRUCTING_FIELD');


// -------------------------------------------------------------
// 5. BOWLER WICKET CREDIT: Explicit Whitelist
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Bowler Wicket Credit Whitelist ---');

const creditedWickets = ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'];
const uncreditedWickets = [
  'RUN_OUT',
  'TIMED_OUT',
  'RETIRED_HURT',
  'RETIRED_OUT',
  'HIT_BALL_TWICE',
  'OBSTRUCTING_FIELD',
  'OTHER',
];

creditedWickets.forEach((wt) => {
  assert.strictEqual(isBowlerCreditedDismissal(wt), true, `Bowler MUST be credited for ${wt}`);
});
console.log('  PASS  5.1: Whitelist credits bowler for BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET');

uncreditedWickets.forEach((wt) => {
  assert.strictEqual(isBowlerCreditedDismissal(wt), false, `Bowler must NOT be credited for ${wt}`);
});
console.log('  PASS  5.2: Non-bowler dismissals (RUN_OUT, RETIRED_OUT, HIT_BALL_TWICE, etc.) do NOT credit bowler');


// -------------------------------------------------------------
// 6. DYNAMIC ALL-OUT THRESHOLDS
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Dynamic All-Out Thresholds ---');

// Standard 11-player lineup -> 10 wickets
assert.strictEqual(getInningsWicketLimit({ battingLineupSize: 11 }), 10, '11-player lineup: maxWickets = 10');
assert.strictEqual(getInningsWicketLimit({ battingTeam: { players: new Array(11) } }), 10, '11 players via battingTeam: maxWickets = 10');

// 13-player tournament squad -> capped at 10 wickets (never 12)
assert.strictEqual(getInningsWicketLimit({ battingTeam: { tournamentSquads: new Array(13) } }), 10, '13 tournament squad players: maxWickets capped at 10');
// 15-player team squad -> capped at 10 wickets (never 14)
assert.strictEqual(getInningsWicketLimit({ battingTeam: { teamPlayers: new Array(15) } }), 10, '15 team players: maxWickets capped at 10');
// 14-player lineup -> capped at 10 wickets
assert.strictEqual(getInningsWicketLimit({ battingLineupSize: 14 }), 10, '14-player lineup: maxWickets capped at 10');
// Explicit maxWickets > 10 -> capped at 10 wickets
assert.strictEqual(getInningsWicketLimit({ maxWickets: 12 }), 10, 'Explicit maxWickets=12: capped at 10');

// 8-player lineup -> 7 wickets
assert.strictEqual(getInningsWicketLimit({ battingLineupSize: 8 }), 7, '8-player lineup: maxWickets = 7');

// 9-player lineup -> 8 wickets
assert.strictEqual(getInningsWicketLimit({ battingLineupSize: 9 }), 8, '9-player lineup: maxWickets = 8');

// Super Over -> exactly 2 wickets
assert.strictEqual(getInningsWicketLimit({ isSuperOver: true, battingLineupSize: 11 }), 2, 'Super Over: maxWickets = 2 regardless of lineup');
assert.strictEqual(getInningsWicketLimit({ inningsNumber: 3, battingLineupSize: 11 }), 2, 'Innings 3 (Super Over): maxWickets = 2');

// Innings.maxWickets explicit field takes precedence if present
assert.strictEqual(getInningsWicketLimit({ maxWickets: 7 }), 7, 'Innings.maxWickets takes precedence');

// isAuthoritativeAllOut helper checks
assert.strictEqual(isAuthoritativeAllOut({ wickets: 7, battingLineupSize: 8 }), true, '7 wickets with 8 players is All Out');
assert.strictEqual(isAuthoritativeAllOut({ wickets: 6, battingLineupSize: 8 }), false, '6 wickets with 8 players is NOT All Out');
assert.strictEqual(isAuthoritativeAllOut({ wickets: 10, battingLineupSize: 11 }), true, '10 wickets with 11 players is All Out');
assert.strictEqual(isAuthoritativeAllOut({ wickets: 9, battingLineupSize: 11 }), false, '9 wickets with 11 players is NOT All Out');
assert.strictEqual(isAuthoritativeAllOut({ isAllOut: true }), true, 'Explicit isAllOut=true is All Out');
console.log('  PASS  6.1: Dynamic All-Out (8->7, 11->10, 13->10 cap, Super Over->2) works authoritatively');


// -------------------------------------------------------------
// 7. DETERMINISTIC MAIDEN OVERS (survives edit, undo, recalculation)
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Deterministic Maiden Overs ---');

// 1. Complete over + 0 bowler runs (all dots) -> Maiden
const maidenDots = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(maidenDots, 'bowler-1', 6), 1, '6 dots = 1 maiden');
console.log('  PASS  7.1: 6 dots = 1 maiden');

// 2. Complete over with Byes/Leg Byes only -> Maiden! (Bowler conceded 0 runs)
const maidenWithByes = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'BYE', byeRuns: 1, isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'LEG_BYE', legByeRuns: 2, isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(maidenWithByes, 'bowler-1', 6), 1, 'Byes and Leg Byes do not prevent maiden (bowler conceded = 0)');
console.log('  PASS  7.2: Over with Byes & Leg Byes only = Maiden (0 runs charged to bowler)');

// 3. Wide in over -> NOT a maiden
const overWithWide = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'WIDE', extras: 1, isLegal: false },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(overWithWide, 'bowler-1', 6), 0, 'Wide prevents maiden (1 run charged to bowler)');
console.log('  PASS  7.3: Wide prevents maiden');

// 4. No-ball in over -> NOT a maiden
const overWithNoBall = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NO_BALL', extras: 1, isLegal: false },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(overWithNoBall, 'bowler-1', 6), 0, 'No-ball prevents maiden (1 run charged to bowler)');
console.log('  PASS  7.4: No-ball prevents maiden');

// 5. Batter run in over -> NOT a maiden
const overWithBatRun = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 1, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(overWithBatRun, 'bowler-1', 6), 0, 'Batter run prevents maiden');
console.log('  PASS  7.5: Batter run prevents maiden');

// 6. Incomplete over (5 legal balls) -> NOT a maiden
const incompleteOver = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(incompleteOver, 'bowler-1', 6), 0, 'Incomplete over cannot be a maiden');
console.log('  PASS  7.6: Incomplete over is NOT a maiden');

// 7. Configurable ballsPerOver (4-ball over)
const maiden4Ball = [
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
  { bowlerId: 'bowler-1', overNumber: 0, runs: 0, extraType: 'NONE', isLegal: true },
];
assert.strictEqual(calculateBowlerMaidens(maiden4Ball, 'bowler-1', 4), 1, '4 dots in 4-ball over = 1 maiden');
console.log('  PASS  7.7: 4-ball over support: 4 dots in 4-ball over = 1 maiden');


// -------------------------------------------------------------
// 8. NO-RESULT NRR EXCLUSION (0 runs, 0 overs)
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 8: No-Result NRR Exclusion ---');

const teamA = { id: 'team-a', name: 'Team Alpha', shortName: 'TMA' };
const teamB = { id: 'team-b', name: 'Team Beta', shortName: 'TMB' };

// Match 1: Completed match (Team A: 80 in 20 ov, Team B: 81 in 18 ov)
const completedMatch = {
  id: 'match-1',
  tournamentId: 't-1',
  stage: 'GROUP',
  groupName: 'Group A',
  status: 'COMPLETED',
  result: 'TEAM_B_WON',
  oversPerInnings: 20,
  ballsPerOver: 6,
  teamAId: 'team-a',
  teamBId: 'team-b',
  innings: [
    {
      id: 'inn-1',
      inningsNumber: 1,
      battingTeamId: 'team-a',
      bowlingTeamId: 'team-b',
      runs: 80,
      wickets: 10,
      overs: 20,
      balls: 0,
      status: 'COMPLETED',
    },
    {
      id: 'inn-2',
      inningsNumber: 2,
      battingTeamId: 'team-b',
      bowlingTeamId: 'team-a',
      runs: 81,
      wickets: 4,
      overs: 18,
      balls: 0,
      status: 'COMPLETED',
    },
  ],
};

// Match 2: NO_RESULT match (abandoned due to rain with partial runs)
const noResultMatch = {
  id: 'match-2',
  tournamentId: 't-1',
  stage: 'GROUP',
  groupName: 'Group A',
  status: 'NO_RESULT',
  result: 'NO_RESULT',
  oversPerInnings: 20,
  ballsPerOver: 6,
  teamAId: 'team-a',
  teamBId: 'team-b',
  innings: [
    {
      id: 'inn-3',
      inningsNumber: 1,
      battingTeamId: 'team-a',
      bowlingTeamId: 'team-b',
      runs: 45, // Partial runs that MUST NOT enter NRR
      wickets: 2,
      overs: 8,
      balls: 2,
      status: 'ABANDONED',
    },
  ],
};

const standingsWithCompletedOnly = computeStageStandings(
  [teamA, teamB],
  [completedMatch],
  'GROUP',
  'Group A',
  6
);

const standingsWithNoResultIncluded = computeStageStandings(
  [teamA, teamB],
  [completedMatch, noResultMatch],
  'GROUP',
  'Group A',
  6
);

const tACompleted = standingsWithCompletedOnly.find((s) => s.teamId === 'team-a');
const tANoResult = standingsWithNoResultIncluded.find((s) => s.teamId === 'team-a');

assert.strictEqual(tANoResult.noResult, 1, 'Team A has 1 no-result');
assert.strictEqual(tANoResult.runsFor, tACompleted.runsFor, 'No-result match contributed ZERO runs to NRR');
assert.strictEqual(tANoResult.oversFor, tACompleted.oversFor, 'No-result match contributed ZERO overs to NRR');
assert.strictEqual(tANoResult.nrr, tACompleted.nrr, 'NRR is identical with and without NO_RESULT match');
console.log('  PASS  8.1: NO_RESULT match contributes 0 runs and 0 overs to NRR');

console.log('\n============================================================');
console.log(' ALL MCC/ICC CRICKET SCORING RULES UNIT TESTS PASSED! ✅');
console.log('============================================================\n');
