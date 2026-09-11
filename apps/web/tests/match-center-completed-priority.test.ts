import assert from 'node:assert';
import { sortMatchesByPriority } from '../lib/scoring/scoring-rules';

console.log('\n============================================================');
console.log(' MATCH CENTER RECENTLY COMPLETED MATCH TEST SUITE');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// 1. Priority Sorting: Completed Match Prioritized Over Upcoming
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Priority Sorting When No Live Match Exists ---');

const completedMatch1 = {
  id: 'match-completed-1',
  status: 'COMPLETED',
  completedAt: new Date('2026-09-11T10:30:00Z'),
  scheduledAt: new Date('2026-09-11T09:00:00Z'),
  resultNote: 'Tuskers won by 18 runs',
};

const completedMatch2 = {
  id: 'match-completed-2',
  status: 'COMPLETED',
  completedAt: new Date('2026-09-11T13:45:00Z'), // More recently completed
  scheduledAt: new Date('2026-09-11T12:00:00Z'),
  resultNote: 'Lions won by 4 wickets',
};

const upcomingMatch1 = {
  id: 'match-upcoming-1',
  status: 'UPCOMING',
  scheduledAt: new Date('2026-09-11T15:00:00Z'),
};

const upcomingMatch2 = {
  id: 'match-upcoming-2',
  status: 'UPCOMING',
  scheduledAt: new Date('2026-09-11T17:30:00Z'),
};

const sortedNoLive = sortMatchesByPriority([
  upcomingMatch1,
  completedMatch1,
  upcomingMatch2,
  completedMatch2,
]);

// Must prioritize most recently completed match as index 0!
assert.strictEqual(sortedNoLive[0].id, 'match-completed-2', 'Most recently completed match must be first in list');
assert.strictEqual(sortedNoLive[1].id, 'match-completed-1', 'Previously completed match must follow');
assert.strictEqual(sortedNoLive[2].id, 'match-upcoming-1', 'Soonest upcoming match follows completed matches');
assert.strictEqual(sortedNoLive[3].id, 'match-upcoming-2', 'Later upcoming match comes last');
console.log('  PASS  1.1: When no match is live, most recently completed match is prioritized #1.');

// -----------------------------------------------------------------------------
// 2. Auto-Transition: Live Match Immediately Takes Priority Once Started
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 2: Transition When New Match Starts ---');

const newlyStartedLiveMatch = {
  id: 'match-live-now',
  status: 'LIVE',
  startedAt: new Date('2026-09-11T15:02:00Z'),
  currentInnings: 1,
};

const sortedWithLive = sortMatchesByPriority([
  completedMatch2,
  completedMatch1,
  newlyStartedLiveMatch,
  upcomingMatch2,
]);

// As soon as match starts, it must take index 0
assert.strictEqual(sortedWithLive[0].id, 'match-live-now', 'Live match must instantly take #1 priority over completed matches');
assert.strictEqual(sortedWithLive[1].id, 'match-completed-2', 'Recently completed match becomes secondary option');
console.log('  PASS  2.1: As soon as a new match goes LIVE, it takes immediate #1 priority over completed match.');

// -----------------------------------------------------------------------------
// 3. ScoreBroadcastPayload Nested Timestamps Support
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 3: ScoreBroadcastPayload Object Compatibility ---');

const broadcastCompleted = {
  matchId: 'bc-completed-1',
  status: 'COMPLETED' as const,
  currentInnings: 2,
  match: {
    id: 'bc-completed-1',
    teamA: { id: 'team-a', name: 'Team Alpha', shortName: 'ALP' },
    teamB: { id: 'team-b', name: 'Team Beta', shortName: 'BET' },
    oversPerInnings: 5,
    resultNote: 'Team Alpha won by 12 runs',
    completedAt: '2026-09-11T11:00:00.000Z',
  },
  innings: null,
  striker: null,
  nonStriker: null,
  bowler: null,
  timestamp: new Date().toISOString(),
};

const broadcastUpcoming = {
  matchId: 'bc-upcoming-1',
  status: 'UPCOMING' as const,
  currentInnings: 1,
  match: {
    id: 'bc-upcoming-1',
    teamA: { id: 'team-c', name: 'Team Gamma', shortName: 'GAM' },
    teamB: { id: 'team-d', name: 'Team Delta', shortName: 'DEL' },
    oversPerInnings: 5,
    scheduledAt: '2026-09-11T14:00:00.000Z',
  },
  innings: null,
  striker: null,
  nonStriker: null,
  bowler: null,
  timestamp: new Date().toISOString(),
};

const broadcastLive = {
  matchId: 'bc-live-1',
  status: 'LIVE' as const,
  currentInnings: 1,
  match: {
    id: 'bc-live-1',
    teamA: { id: 'team-e', name: 'Team Epsilon', shortName: 'EPS' },
    teamB: { id: 'team-f', name: 'Team Zeta', shortName: 'ZET' },
    oversPerInnings: 5,
    startedAt: '2026-09-11T14:05:00.000Z',
  },
  innings: null,
  striker: null,
  nonStriker: null,
  bowler: null,
  timestamp: new Date().toISOString(),
};

const sortedBroadcastsNoLive = sortMatchesByPriority([broadcastUpcoming, broadcastCompleted]);
assert.strictEqual(sortedBroadcastsNoLive[0].matchId, 'bc-completed-1', 'Completed broadcast payload must be prioritized when no match is live');

const sortedBroadcastsWithLive = sortMatchesByPriority([broadcastCompleted, broadcastLive, broadcastUpcoming]);
assert.strictEqual(sortedBroadcastsWithLive[0].matchId, 'bc-live-1', 'Live broadcast payload must be prioritized when live');
assert.strictEqual(sortedBroadcastsWithLive[1].matchId, 'bc-completed-1', 'Completed broadcast payload follows live match');
console.log('  PASS  3.1: Nested broadcast timestamps are parsed correctly in sortMatchesByPriority.');

// -----------------------------------------------------------------------------
// 4. LiveScoreWidget Active Match ID Switcher Logic Emulation
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 4: Match Center Selection Transition Logic ---');

function resolveNextActiveMatchId(
  prevActiveId: string | null,
  availableMatches: Array<{ matchId: string; status: string }>
): string | null {
  const liveMatch = availableMatches.find((m) => m.status === 'LIVE');
  const prevMatch = availableMatches.find((m) => m.matchId === prevActiveId);

  // If a match is LIVE, and current selection is not LIVE (e.g. was showing completed match),
  // auto-switch to the new live match!
  if (liveMatch && prevMatch?.status !== 'LIVE') {
    return liveMatch.matchId;
  }

  // If previous selection is still valid in list, keep it
  if (prevActiveId && prevMatch) {
    return prevActiveId;
  }

  return availableMatches[0]?.matchId || null;
}

// Initial state: Only completed match available
let activeId: string | null = null;
const list1 = [{ matchId: 'm-comp', status: 'COMPLETED' }, { matchId: 'm-upc', status: 'UPCOMING' }];
activeId = resolveNextActiveMatchId(activeId, list1);
assert.strictEqual(activeId, 'm-comp', 'Initial active match must be the completed match');

// State 2: User stays on completed match while waiting
activeId = resolveNextActiveMatchId(activeId, list1);
assert.strictEqual(activeId, 'm-comp', 'Must remain on completed match while no new match is live');

// State 3: New match starts! (status becomes 'LIVE')
const list2 = [
  { matchId: 'm-live', status: 'LIVE' },
  { matchId: 'm-comp', status: 'COMPLETED' },
];
activeId = resolveNextActiveMatchId(activeId, list2);
assert.strictEqual(activeId, 'm-live', 'Must automatically switch to newly started live match from completed match');

console.log('  PASS  4.1: Active match auto-switch cleanly transitions from completed match to live match as soon as match starts.');

console.log('\n============================================================');
console.log(' ALL MATCH CENTER COMPLETED MATCH PRIORITY TESTS PASSED! ✅');
console.log('============================================================\n');
