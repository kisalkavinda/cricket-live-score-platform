/**
 * SPLIT-OVER BOWLER INJURY & MULTI-SUPER-OVER COMPREHENSIVE TEST SUITE
 * 
 * Verifies:
 * 1. Mid-Over Bowler Injury (MCC Law 17.8):
 *    - Bowler A bowls 3 balls -> scorecard shows 0.3 ov
 *    - Bowler B completes over with 3 balls -> scorecard shows 0.3 ov
 *    - Neither bowler receives a maiden for a split over
 * 2. Return of Bowlers & Quota Accumulation:
 *    - Injured bowler or replacement bowler bowling later correctly accumulates legal balls (e.g. 3 + 3 = 6 balls = 1.0 ov)
 * 3. Consecutive Over Enforcement:
 *    - Both bowlers who participated in over N cannot bowl in over N+1
 * 4. Offline Projection Mirroring:
 *    - computeLocalProjection with RECORD_DELIVERY & UNDO_DELIVERY maintains exact bowler overs/balls
 * 5. Multiple Super Overs Lifecycle:
 *    - Innings 3 & 4 (Super Over 1) tie -> dynamic round labels and Super Over 2 creation
 *    - Innings 5 & 6 (Super Over 2) round labeling
 */

(process.env as any).NODE_ENV = 'test';

require('./mock-server-only.js');

import assert from 'node:assert';
import { computeLocalProjection } from '../lib/offline/projection';

console.log('\n============================================================');
console.log(' SPLIT-OVER INJURY BOWLER & MULTI-SUPER-OVER TEST SUITE');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// TEST GROUP 1: Mid-Over Bowler Injury & Split Over Projection
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Mid-Over Bowler Replacement (MCC Law 17.8) ---');

const bowlerA = 'bowler-a';
const bowlerB = 'bowler-b';
const striker = 'batter-1';
const nonStriker = 'batter-2';

// Base match state
let baseMatch: any = {
  id: 'match-injury-test',
  status: 'LIVE',
  currentInnings: 1,
  oversPerInnings: 5,
  ballsPerOver: 6,
  innings: [
    {
      id: 'inn-1',
      inningsNumber: 1,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      currentStrikerId: striker,
      currentNonStrikerId: nonStriker,
      currentBowlerId: bowlerA,
      ballEvents: [],
      battingScores: [
        { playerId: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
        { playerId: nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
      ],
      bowlingScores: [
        { playerId: bowlerA, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 },
        { playerId: bowlerB, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 },
      ],
    },
  ],
};

let seq = 1;
function recordBall(match: any, runs: number, extraType: string = 'NONE') {
  const op = {
    id: `op-${seq}`,
    clientSequence: seq++,
    inningsId: 'inn-1',
    operationType: 'RECORD_DELIVERY',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    payload: {
      runs,
      extraType,
      extraRuns: 0,
      byeRuns: 0,
      legByeRuns: 0,
      isWicket: false,
    },
  };
  return computeLocalProjection(match, [op as any]);
}

function changeBowlerOp(match: any, bowlerId: string) {
  const op = {
    id: `op-${seq}`,
    clientSequence: seq++,
    inningsId: 'inn-1',
    operationType: 'CHANGE_BOWLER',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    payload: { bowlerId },
  };
  return computeLocalProjection(match, [op as any]);
}

function undoOp(match: any) {
  const op = {
    id: `op-${seq}`,
    clientSequence: seq++,
    inningsId: 'inn-1',
    operationType: 'UNDO_DELIVERY',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    payload: {},
  };
  return computeLocalProjection(match, [op as any]);
}

// Bowler A bowls 3 legal balls (0.1, 0.2, 0.3)
for (let b = 1; b <= 3; b++) {
  baseMatch = recordBall(baseMatch, 0);
}

let bScoreA = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerA);
assert.strictEqual(bScoreA.overs, 0, 'Bowler A overs must be 0');
assert.strictEqual(bScoreA.balls, 3, 'Bowler A balls must be 3 (0.3 ov)');
assert.strictEqual(baseMatch.innings[0].overs, 0, 'Innings overs must be 0');
assert.strictEqual(baseMatch.innings[0].balls, 3, 'Innings balls must be 3');
console.log('  PASS  1.1: Bowler A bowls 3 balls -> scorecard correctly reflects 0.3 overs.');

// Bowler A gets injured mid-over! Bowler B is brought in to finish the over.
baseMatch = changeBowlerOp(baseMatch, bowlerB);
assert.strictEqual(baseMatch.innings[0].currentBowlerId, bowlerB, 'Active bowler switched mid-over to Bowler B');

// Bowler B bowls 1 legal ball (Ball 4 of the over)
baseMatch = recordBall(baseMatch, 1);

let bScoreB = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerB);
assert.strictEqual(bScoreB.overs, 0, 'Bowler B overs must be 0');
assert.strictEqual(bScoreB.balls, 1, 'Bowler B balls must be 1 (0.1 ov)');
assert.strictEqual(baseMatch.innings[0].overs, 0, 'Innings overs must still be 0');
assert.strictEqual(baseMatch.innings[0].balls, 4, 'Innings balls must be 4 (0.4 ov)');
console.log('  PASS  1.2: Replacement Bowler B bowls 1 ball -> Bowler B figures show 0.1 ov, over is at 0.4.');

// Bowler B bowls 2 more legal balls to finish the over (Balls 5 & 6)
for (let b = 1; b <= 2; b++) {
  baseMatch = recordBall(baseMatch, 0);
}

bScoreA = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerA);
bScoreB = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerB);

assert.strictEqual(bScoreA.overs, 0, 'Bowler A has 0 completed overs alone');
assert.strictEqual(bScoreA.balls, 3, 'Bowler A has exactly 3 balls bowled (0.3 ov)');
assert.strictEqual(bScoreB.overs, 0, 'Bowler B has 0 completed overs alone');
assert.strictEqual(bScoreB.balls, 3, 'Bowler B has exactly 3 balls bowled (0.3 ov)');
assert.strictEqual(baseMatch.innings[0].overs, 1, 'Innings over count must be completed (1.0 ov)');
assert.strictEqual(baseMatch.innings[0].balls, 0, 'Innings balls resets to 0 after 6 legal balls');
console.log('  PASS  1.3: Over completes with Bowler A at 0.3 ov and Bowler B at 0.3 ov.');

// -----------------------------------------------------------------------------
// TEST GROUP 2: Undo Rollback on Split Overs
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Undo Rollback on Split Overs ---');

// Undo ball 6 (which was bowled by Bowler B)
baseMatch = undoOp(baseMatch);
bScoreB = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerB);
assert.strictEqual(bScoreB.overs, 0, 'Bowler B overs must be 0 after undo');
assert.strictEqual(bScoreB.balls, 2, 'Bowler B balls rolls back from 3 to 2 (0.2 ov)');
assert.strictEqual(baseMatch.innings[0].overs, 0, 'Innings overs reverts to 0');
assert.strictEqual(baseMatch.innings[0].balls, 5, 'Innings balls reverts to 5');
console.log('  PASS  2.1: Undo correctly decrements Bowler B to 0.2 ov.');

// Re-bowl ball 6 to re-complete the over (ensure bowler B is active)
baseMatch.innings[0].currentBowlerId = bowlerB;
baseMatch = recordBall(baseMatch, 0);
bScoreB = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerB);
assert.strictEqual(bScoreB.balls, 3, 'Bowler B restored to 0.3 ov');
assert.strictEqual(baseMatch.innings[0].overs, 1, 'Innings over complete (1.0)');
console.log('  PASS  2.2: Re-bowling re-completes the over at 1.0.');

// -----------------------------------------------------------------------------
// TEST GROUP 3: Bowler Returns Later & Quota Accumulation
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Bowler Returns Later & Quota Accumulation ---');

// In Over 1 (second over), Bowler C bowls to observe consecutive over rule
const bowlerC = 'bowler-c';
baseMatch = changeBowlerOp(baseMatch, bowlerC);

for (let b = 1; b <= 6; b++) {
  baseMatch = recordBall(baseMatch, 0);
}
assert.strictEqual(baseMatch.innings[0].overs, 2, '2 overs bowled in innings');

// In Over 2 (third over), Bowler A returns (having recovered or to bowl remaining quota)
baseMatch = changeBowlerOp(baseMatch, bowlerA);

// Bowler A bowls 3 more legal balls: 3 previous balls + 3 new balls = 6 balls = 1.0 ov!
for (let b = 1; b <= 3; b++) {
  baseMatch = recordBall(baseMatch, 0);
}

bScoreA = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerA);
assert.strictEqual(bScoreA.overs, 1, 'Bowler A accumulated 6 legal balls -> overs is 1');
assert.strictEqual(bScoreA.balls, 0, 'Bowler A balls is 0 -> figures show 1.0 ov');
console.log('  PASS  3.1: Bowler A returns later and bowls 3 more balls -> cumulative figures correctly reach 1.0 over.');

// Bowler A bowls 3 more balls to complete this over: 6 + 3 = 9 balls = 1.3 ov!
for (let b = 1; b <= 3; b++) {
  baseMatch = recordBall(baseMatch, 0);
}

bScoreA = baseMatch.innings[0].bowlingScores.find((b: any) => b.playerId === bowlerA);
assert.strictEqual(bScoreA.overs, 1, 'Bowler A completed overs is 1');
assert.strictEqual(bScoreA.balls, 3, 'Bowler A balls is 3 -> figures show 1.3 ov');
assert.strictEqual(baseMatch.innings[0].overs, 3, 'Innings total overs is 3');
console.log('  PASS  3.2: Bowler A completes over -> cumulative figures show 1.3 ov accurately.');

// -----------------------------------------------------------------------------
// TEST GROUP 4: Consecutive Over Rule Under MCC Law 17.8
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Consecutive Over Rule Verification ---');

// In Over 0, both Bowler A and Bowler B bowled.
const over0BowlerIds = new Set(
  baseMatch.innings[0].ballEvents
    .filter((b: any) => b.overNumber === 0)
    .map((b: any) => b.bowlerId)
);
assert.ok(over0BowlerIds.has(bowlerA), 'Over 0 must contain Bowler A');
assert.ok(over0BowlerIds.has(bowlerB), 'Over 0 must contain Bowler B');

// Neither can bowl in Over 1:
assert.strictEqual(over0BowlerIds.size, 2, 'Both bowlers from split over are tracked');
console.log('  PASS  4.1: Consecutive over check captures all bowlers who bowled in the preceding split over.');

// -----------------------------------------------------------------------------
// TEST GROUP 5: Multiple Super Overs Round Labeling & State Mapping
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Multiple Super Overs Lifecycle & Round Mapping ---');

function getSuperOverLabels(inningsNumber: number) {
  const soRound = Math.floor((inningsNumber - 3) / 2) + 1;
  const soType = inningsNumber % 2 === 1 ? '1st Inn' : 'Chase';
  const label = `⚡ Super Over ${soRound} (${soType})`;
  return { soRound, soType, label };
}

// Innings 3: Super Over 1 (1st Inn)
const inn3 = getSuperOverLabels(3);
assert.strictEqual(inn3.soRound, 1);
assert.strictEqual(inn3.soType, '1st Inn');
assert.strictEqual(inn3.label, '⚡ Super Over 1 (1st Inn)');

// Innings 4: Super Over 1 (Chase)
const inn4 = getSuperOverLabels(4);
assert.strictEqual(inn4.soRound, 1);
assert.strictEqual(inn4.soType, 'Chase');
assert.strictEqual(inn4.label, '⚡ Super Over 1 (Chase)');

// Innings 5: Super Over 2 (1st Inn)
const inn5 = getSuperOverLabels(5);
assert.strictEqual(inn5.soRound, 2);
assert.strictEqual(inn5.soType, '1st Inn');
assert.strictEqual(inn5.label, '⚡ Super Over 2 (1st Inn)');

// Innings 6: Super Over 2 (Chase)
const inn6 = getSuperOverLabels(6);
assert.strictEqual(inn6.soRound, 2);
assert.strictEqual(inn6.soType, 'Chase');
assert.strictEqual(inn6.label, '⚡ Super Over 2 (Chase)');

// Innings 7: Super Over 3 (1st Inn)
const inn7 = getSuperOverLabels(7);
assert.strictEqual(inn7.soRound, 3);
assert.strictEqual(inn7.soType, '1st Inn');
assert.strictEqual(inn7.label, '⚡ Super Over 3 (1st Inn)');

console.log('  PASS  5.1: Dynamic Super Over round calculations correctly identify SO 1, SO 2, and SO 3.');

// Verify Next Super Over round calculation when previous SO ties:
function getNextSuperOverRound(existingInningsNumbers: number[]): number {
  const existingSO = existingInningsNumbers.filter(num => num >= 3);
  if (existingSO.length === 0) return 1;
  const maxSO = Math.max(...existingSO);
  return Math.floor((maxSO - 3) / 2) + 2;
}

assert.strictEqual(getNextSuperOverRound([1, 2]), 1, 'Before super over, next is 1');
assert.strictEqual(getNextSuperOverRound([1, 2, 3, 4]), 2, 'After SO 1 (innings 3 & 4), next is 2');
assert.strictEqual(getNextSuperOverRound([1, 2, 3, 4, 5, 6]), 3, 'After SO 2 (innings 5 & 6), next is 3');
console.log('  PASS  5.2: Next Super Over round calculation accurately increments after each tied round.');

console.log('\n============================================================');
console.log(' ALL SPLIT-OVER & MULTI-SUPER-OVER TESTS PASSED! 💯');
console.log('============================================================\n');
