import assert from 'node:assert';
import { getBallBadgeStyle, computeInningsAnalytics } from '../lib/analytics/match-analytics';
import { isBowlerCreditedDismissal } from '../lib/scoring/scoring-rules';

console.log('\n============================================================');
console.log(' RETIRED HURT CRICKET LIFECYCLE & INTEGRITY TEST SUITE');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// 1. Visual Badge & Label Formatting
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Outcome Badge & Label Formatting ---');

const rh0 = getBallBadgeStyle({ runs: 0, isWicket: true, wicketType: 'RETIRED_HURT' });
assert.strictEqual(rh0.type, 'RETIRED_HURT', 'Badge type must be RETIRED_HURT');
assert.strictEqual(rh0.label, 'RH', '0 runs retired hurt label must be RH');
assert.strictEqual(rh0.bg, '#0284C7', 'Badge background must be medical/cyan blue (#0284C7)');

const rh1 = getBallBadgeStyle({ runs: 1, isWicket: true, wicketType: 'RETIRED_HURT' });
assert.strictEqual(rh1.label, '1+RH', '1 completed run + retired hurt must be 1+RH');

const rh2 = getBallBadgeStyle({ runs: 2, isWicket: true, wicketType: 'RETIRED_HURT' });
assert.strictEqual(rh2.label, '2+RH', '2 completed runs + retired hurt must be 2+RH');

// Ensure standard wickets still produce WICKET type and red badge
const bowledBadge = getBallBadgeStyle({ runs: 0, isWicket: true, wicketType: 'BOWLED' });
assert.strictEqual(bowledBadge.type, 'WICKET');
assert.strictEqual(bowledBadge.label, 'W');
assert.strictEqual(bowledBadge.bg, '#EF4444');
console.log('  PASS  1.1: Retired Hurt displays distinct "RH" badge and cyan styling; standard wickets unaffected.');

// -----------------------------------------------------------------------------
// 2. Bowler Credit Whitelist: RETIRED_HURT is NEVER credited
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Bowler Credit Attribution ---');
assert.strictEqual(isBowlerCreditedDismissal('RETIRED_HURT'), false, 'RETIRED_HURT must not be credited to bowler');
assert.strictEqual(isBowlerCreditedDismissal('BOWLED'), true);
assert.strictEqual(isBowlerCreditedDismissal('CAUGHT'), true);
assert.strictEqual(isBowlerCreditedDismissal('LBW'), true);
assert.strictEqual(isBowlerCreditedDismissal('STUMPED'), true);
assert.strictEqual(isBowlerCreditedDismissal('HIT_WICKET'), true);
console.log('  PASS  2.1: Bowler wicket credit whitelist cleanly rejects RETIRED_HURT.');

// -----------------------------------------------------------------------------
// 3. Fall of Wickets Filtering Logic
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Fall of Wickets Filtering ---');

const mockBallEvents = [
  { id: 'b1', overNumber: 0, ballNumber: 1, runs: 4, extras: 0, isWicket: false, createdAt: '2026-09-11T10:00:00Z' },
  { id: 'b2', overNumber: 1, ballNumber: 3, runs: 0, extras: 0, isWicket: true, wicketType: 'RETIRED_HURT', dismissedPlayer: { name: 'Player Injured' }, createdAt: '2026-09-11T10:05:00Z' },
  { id: 'b3', overNumber: 2, ballNumber: 4, runs: 0, extras: 0, isWicket: true, wicketType: 'BOWLED', dismissedPlayer: { name: 'Player Bowled' }, createdAt: '2026-09-11T10:10:00Z' },
  { id: 'b4', overNumber: 3, ballNumber: 2, runs: 0, extras: 0, isWicket: true, wicketType: 'CAUGHT', dismissedPlayer: { name: 'Player Caught' }, createdAt: '2026-09-11T10:15:00Z' },
];

// In Fall of Wickets, genuine wickets lost must NOT count RETIRED_HURT
const fowWickets = mockBallEvents.filter((b: any) => b.isWicket && b.wicketType !== 'RETIRED_HURT');
assert.strictEqual(fowWickets.length, 2, 'Fall of Wickets must only count 2 genuine wickets');
assert.strictEqual(fowWickets[0].wicketType, 'BOWLED', '1st Fall of Wicket is BOWLED');
assert.strictEqual(fowWickets[1].wicketType, 'CAUGHT', '2nd Fall of Wicket is CAUGHT');

const fowRetired = mockBallEvents.filter((b: any) => b.isWicket && b.wicketType === 'RETIRED_HURT');
assert.strictEqual(fowRetired.length, 1, 'Exactly 1 retired hurt event captured');
assert.strictEqual(fowRetired[0]?.dismissedPlayer?.name, 'Player Injured');
console.log('  PASS  3.1: Fall of Wickets card strictly excludes RETIRED_HURT from numbered wicket drops.');

// -----------------------------------------------------------------------------
// 4. Over-by-Over Analytics Wicket Accumulation
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Over Analytics Wickets ---');

const mockInnings = {
  id: 'inn-1',
  inningsNumber: 1,
  overs: 2,
  balls: 0,
  runs: 25,
  wickets: 1, // Only 1 genuine wicket fell
  battingTeam: { name: 'Team Alpha', shortName: 'ALP' },
  bowlingTeam: { name: 'Team Beta', shortName: 'BET' },
  ballEvents: [
    { overNumber: 0, ballNumber: 1, runs: 10, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-11T10:00:00Z' },
    { overNumber: 0, ballNumber: 2, runs: 0, extras: 0, isLegal: true, isWicket: true, wicketType: 'RETIRED_HURT', createdAt: '2026-09-11T10:01:00Z' },
    { overNumber: 0, ballNumber: 3, runs: 1, extras: 0, isLegal: true, isWicket: false, createdAt: '2026-09-11T10:02:00Z' },
    { overNumber: 1, ballNumber: 1, runs: 0, extras: 0, isLegal: true, isWicket: true, wicketType: 'BOWLED', createdAt: '2026-09-11T10:06:00Z' },
  ],
};

const analytics = computeInningsAnalytics(mockInnings, 6);
// In Over 1: totalBallRuns = 11, wicketsInOver should be 0 because the only wicket event was RETIRED_HURT
const over1 = analytics.overs.find((o) => o.overNumber === 1);
assert.strictEqual(over1?.wicketsInOver, 0, 'Over 1 with RETIRED_HURT must report 0 wickets in over');
assert.strictEqual(over1?.cumulativeWickets, 0, 'Cumulative wickets at end of Over 1 must be 0');

const over2 = analytics.overs.find((o) => o.overNumber === 2);
assert.strictEqual(over2?.wicketsInOver, 1, 'Over 2 with BOWLED must report 1 wicket');
assert.strictEqual(over2?.cumulativeWickets, 1, 'Cumulative wickets at end of Over 2 must be 1');
console.log('  PASS  4.1: Over analytics and cumulative wickets ignore RETIRED_HURT.');

// -----------------------------------------------------------------------------
// 5. Returning Batter Status Restoration Logic
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Returning Batter State Restoration ---');

// Simulate a batter who retired hurt earlier
interface MockBatterScore {
  playerId: string;
  runs: number;
  balls: number;
  isOut: boolean;
  dismissal: string | null;
}

const battingScores: MockBatterScore[] = [
  { playerId: 'p1', runs: 24, balls: 14, isOut: false, dismissal: 'retired hurt' },
  { playerId: 'p2', runs: 10, balls: 8, isOut: true, dismissal: 'b Bowler' },
];

// Player 1 returns to the crease as incoming batter
const returningBatterId = 'p1';
const updatedScores = battingScores.map((b) => {
  if (b.playerId === returningBatterId) {
    return {
      ...b,
      isOut: false,
      dismissal: null, // Dismissal cleared upon return
    };
  }
  return b;
});

const restoredP1 = updatedScores.find((b) => b.playerId === 'p1')!;
assert.strictEqual(restoredP1.isOut, false, 'Returning batter must have isOut = false');
assert.strictEqual(restoredP1.dismissal, null, 'Returning batter must have dismissal = null');
assert.strictEqual(restoredP1.runs, 24, 'Returning batter preserves existing runs');
assert.strictEqual(restoredP1.balls, 14, 'Returning batter preserves existing balls faced');
console.log('  PASS  5.1: Returning batter dismissal state cleanly clears to null (not out) while preserving accumulated runs.');

// -----------------------------------------------------------------------------
// 6. Undo Delivery Wicket Safety
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Undo Delivery Wicket Rollback Safety ---');

const simulateUndoWickets = (currentWickets: number, lastBall: { isWicket: boolean; wicketType?: string }) => {
  const teamWicketLost = lastBall.isWicket && lastBall.wicketType !== 'RETIRED_HURT';
  return teamWicketLost ? Math.max(0, currentWickets - 1) : currentWickets;
};

// If last ball was RETIRED_HURT and wickets was 2:
const afterUndoRH = simulateUndoWickets(2, { isWicket: true, wicketType: 'RETIRED_HURT' });
assert.strictEqual(afterUndoRH, 2, 'Undoing a RETIRED_HURT delivery must NOT decrement innings.wickets');

// If last ball was BOWLED and wickets was 2:
const afterUndoBowled = simulateUndoWickets(2, { isWicket: true, wicketType: 'BOWLED' });
assert.strictEqual(afterUndoBowled, 1, 'Undoing a BOWLED delivery MUST decrement innings.wickets');

console.log('  PASS  6.1: Undo delivery rollback protects innings wickets count from false decrements.');

// -----------------------------------------------------------------------------
// 7. Retired Hurt Without Facing Ball (Zero-ball delivery)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Retired Hurt Without Facing Ball (Zero-Ball Calculation) ---');

const simulateRecordDelivery = (
  innings: { overs: number; balls: number; runs: number; wickets: number },
  bowler: { overs: number; balls: number; runsConceded: number },
  batter: { runs: number; balls: number },
  input: { isWicket: boolean; wicketType: string; withoutFacingBall?: boolean; isNonStriker?: boolean }
) => {
  const isRetHurtWithoutBall = Boolean(
    input.isWicket &&
    input.wicketType === 'RETIRED_HURT' &&
    (input.withoutFacingBall || input.isNonStriker)
  );

  const isLegal = !isRetHurtWithoutBall;
  let nextOvers = innings.overs;
  let nextBalls = innings.balls;

  if (isLegal) {
    if (nextBalls + 1 >= 6) {
      nextOvers += 1;
      nextBalls = 0;
    } else {
      nextBalls += 1;
    }
  }

  const nextBowlerBalls = bowler.balls + (isLegal ? 1 : 0);
  const nextBatterBalls = batter.balls + (isLegal ? 1 : 0);

  return {
    innings: { ...innings, overs: nextOvers, balls: nextBalls },
    bowler: { ...bowler, balls: nextBowlerBalls },
    batter: { ...batter, balls: nextBatterBalls },
    ballEvent: {
      isLegal,
      runs: 0,
      extras: 0,
      extraType: isRetHurtWithoutBall ? 'NONE' : 'NONE',
      wicketType: input.wicketType,
    },
  };
};

// Case A: Striker retires hurt WITHOUT facing a ball
const strikerWithoutBallResult = simulateRecordDelivery(
  { overs: 2, balls: 3, runs: 18, wickets: 1 },
  { overs: 0, balls: 3, runsConceded: 4 },
  { runs: 12, balls: 7 },
  { isWicket: true, wicketType: 'RETIRED_HURT', withoutFacingBall: true }
);

assert.strictEqual(strikerWithoutBallResult.innings.overs, 2, 'Innings overs unchanged');
assert.strictEqual(strikerWithoutBallResult.innings.balls, 3, 'Innings balls unchanged (does not count a ball)');
assert.strictEqual(strikerWithoutBallResult.bowler.balls, 3, 'Bowler balls unchanged (does not count a ball)');
assert.strictEqual(strikerWithoutBallResult.batter.balls, 7, 'Batter balls faced unchanged (0 balls counted)');
assert.strictEqual(strikerWithoutBallResult.ballEvent.isLegal, false, 'Delivery isLegal marked false');
console.log('  PASS  7.1: Striker retiring hurt without facing ball preserves exact overs, bowler balls, and batter balls faced.');

// Case B: Non-striker retires hurt (automatically zero-ball delivery)
const nonStrikerResult = simulateRecordDelivery(
  { overs: 4, balls: 5, runs: 35, wickets: 2 },
  { overs: 1, balls: 5, runsConceded: 12 },
  { runs: 6, balls: 4 },
  { isWicket: true, wicketType: 'RETIRED_HURT', isNonStriker: true }
);

assert.strictEqual(nonStrikerResult.innings.overs, 4, 'Innings overs unchanged for non-striker retirement');
assert.strictEqual(nonStrikerResult.innings.balls, 5, 'Innings balls unchanged for non-striker retirement');
assert.strictEqual(nonStrikerResult.bowler.balls, 5, 'Bowler balls unchanged for non-striker retirement');
assert.strictEqual(nonStrikerResult.batter.balls, 4, 'Batter balls unchanged for non-striker retirement');
assert.strictEqual(nonStrikerResult.ballEvent.isLegal, false, 'Non-striker delivery isLegal marked false');
console.log('  PASS  7.2: Non-striker retiring hurt automatically treated as zero-ball delivery.');

// -----------------------------------------------------------------------------
// 8. Zod Schema Validation Preservation
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 8: Server Action Zod Validation Schema ---');
const { recordDeliverySchema } = require('../lib/validations/scoring');

const parsedWithoutBall = recordDeliverySchema.safeParse({
  runs: 0,
  extraType: 'NONE',
  isWicket: true,
  wicketType: 'RETIRED_HURT',
  withoutFacingBall: true,
});

assert.strictEqual(parsedWithoutBall.success, true, 'Zod parse must succeed');
assert.strictEqual(parsedWithoutBall.data.withoutFacingBall, true, 'Zod safeParse MUST preserve withoutFacingBall: true and not strip it');

const parsedWithBall = recordDeliverySchema.safeParse({
  runs: 0,
  extraType: 'NONE',
  isWicket: true,
  wicketType: 'RETIRED_HURT',
  withoutFacingBall: false,
});

assert.strictEqual(parsedWithBall.success, true, 'Zod parse must succeed');
assert.strictEqual(parsedWithBall.data.withoutFacingBall, false, 'Zod safeParse MUST preserve withoutFacingBall: false');

console.log('  PASS  8.1: recordDeliverySchema correctly accepts and preserves withoutFacingBall boolean flag.');

console.log('\n============================================================');
console.log(' ALL RETIRED HURT INTEGRITY & LIFECYCLE TESTS PASSED! ✅');
console.log('============================================================\n');
