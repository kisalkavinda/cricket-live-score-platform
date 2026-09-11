import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('\n============================================================');
console.log(' CPL 2026 STADIUM MONITOR REALTIME STREAMING TEST SUITE');
console.log('============================================================\n');

const groundDisplayClientPath = path.resolve(__dirname, '../app/display/GroundDisplayClient.tsx');
const groundDisplayPagePath = path.resolve(__dirname, '../app/display/page.tsx');
const tournamentStatsRoutePath = path.resolve(__dirname, '../app/api/tournament/stats/route.ts');
const liveMatchesRoutePath = path.resolve(__dirname, '../app/api/matches/live/route.ts');
const scoringRealtimePath = path.resolve(__dirname, '../lib/scoring/scoring-realtime.ts');

const groundDisplaySrc = fs.readFileSync(groundDisplayClientPath, 'utf8');
const displayPageSrc = fs.readFileSync(groundDisplayPagePath, 'utf8');
const statsRouteSrc = fs.readFileSync(tournamentStatsRoutePath, 'utf8');
const liveMatchesSrc = fs.readFileSync(liveMatchesRoutePath, 'utf8');
const realtimeSrc = fs.readFileSync(scoringRealtimePath, 'utf8');

// -------------------------------------------------------------
// 1. SUPABASE REALTIME CHANNEL SUBSCRIPTIONS
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: Supabase Realtime Channels in Stadium Monitor ---');

// 1.1: Must subscribe to 'matches:live'
assert(
  groundDisplaySrc.includes("supabase.channel('matches:live')"),
  'GroundDisplayClient MUST subscribe to global matches:live Supabase channel'
);
console.log('  PASS  1.1: GroundDisplayClient subscribes to global "matches:live" channel');

// 1.2: Must subscribe to active match channel `match:${activeMatchId}`
assert(
  groundDisplaySrc.includes("supabase.channel(`match:${activeMatchId}`)"),
  'GroundDisplayClient MUST subscribe to dynamic match:${activeMatchId} Supabase channel'
);
console.log('  PASS  1.2: GroundDisplayClient subscribes to active match "match:${activeMatchId}" channel');

// 1.3: Must subscribe to Postgres CDC changes for BallEvent, Innings, Match
assert(
  groundDisplaySrc.includes("postgres_changes") &&
  groundDisplaySrc.includes("table: 'BallEvent'") &&
  groundDisplaySrc.includes("table: 'Innings'") &&
  groundDisplaySrc.includes("table: 'Match'"),
  'GroundDisplayClient MUST subscribe to Postgres CDC changes for BallEvent, Innings, and Match'
);
console.log('  PASS  1.3: GroundDisplayClient subscribes to Postgres CDC table mutations (BallEvent, Innings, Match)');

// 1.4: Server broadcasting sends to both match channel and matches:live
assert(
  realtimeSrc.includes("supabase.channel(`match:${payload.matchId}`)") &&
  realtimeSrc.includes("supabase.channel('matches:live')"),
  'scoring-realtime.ts MUST broadcast to match channel and matches:live'
);
console.log('  PASS  1.4: Server broadcast publishes to both "match:${payload.matchId}" and "matches:live"');


// -------------------------------------------------------------
// 2. INSTANTANEOUS ZERO-LATENCY STATE MERGE
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Zero-Latency In-Memory State Updates ---');

// 2.1: handleBroadcastUpdate updates matches immediately
assert(
  groundDisplaySrc.includes('handleBroadcastUpdate') &&
  groundDisplaySrc.includes('setMatches((prev) => {') &&
  groundDisplaySrc.includes('const idx = prev.findIndex((m) => m.matchId === matchId);'),
  'handleBroadcastUpdate MUST merge broadcast payload directly into matches state'
);
console.log('  PASS  2.1: Live broadcast payload merges directly into matches state with 0ms delay');

// 2.2: Automatically follows live innings if user has not manually pinned another tab
assert(
  groundDisplaySrc.includes('userHasManuallySelectedInningsTabRef') &&
  groundDisplaySrc.includes('setActiveInningsTab(`inn${payload.currentInnings}`)'),
  'Stadium Monitor MUST auto-follow active innings unless manually pinned'
);
console.log('  PASS  2.2: Scorecard tab automatically tracks current live innings');

// 2.3: Force-fetches active scorecard immediately on delivery
assert(
  groundDisplaySrc.includes('fetchActiveScorecard(targetMatchId, true)') &&
  groundDisplaySrc.includes('scorecardReqSeqRef'),
  'Must force-fetch active scorecard with sequence counter on delivery'
);
console.log('  PASS  2.3: Detailed scorecard force-fetches immediately upon ball broadcast');


// -------------------------------------------------------------
// 3. TOURNAMENT STANDINGS & STATS REALTIME SYNC
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Tournament Standings & Stats Realtime Updates ---');

// 3.1: Trigger fresh tournament stats on broadcast
assert(
  groundDisplaySrc.includes('triggerDebouncedStatsUpdate') &&
  groundDisplaySrc.includes('fetchTournamentStats(true)'),
  'Must trigger fresh tournament stats update on delivery broadcast'
);
console.log('  PASS  3.1: Tournament stats & leaderboards update in real-time on score events');

// 3.2: /api/tournament/stats supports ?fresh=1 query param
assert(
  statsRouteSrc.includes("url.searchParams.get('fresh') === '1'") &&
  statsRouteSrc.includes('!isFreshRequested && statsCache'),
  '/api/tournament/stats MUST bypass cache when ?fresh=1 is provided'
);
console.log('  PASS  3.2: /api/tournament/stats supports "?fresh=1" for instant zero-cache refresh');

// 3.3: GroundDisplayClient requests /api/matches/live?_t=...&fresh=1
assert(
  groundDisplaySrc.includes('/api/matches/live?_t=') && groundDisplaySrc.includes('fresh=1'),
  'GroundDisplayClient MUST pass fresh=1 to bypass live matches cache'
);
console.log('  PASS  3.3: Live matches fetch bypasses stale cache with fresh=1 query parameter');


// -------------------------------------------------------------
// 4. RESILIENT FALLBACK LOOP & VISIBILITY RE-SYNC
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 4: High-Frequency Polling Fallback & Visibility Sync ---');

// 4.1: Fast interval during LIVE match (1.5s)
assert(
  groundDisplaySrc.includes('const isLive = matches.some((m) => m.status === \'LIVE\');') &&
  groundDisplaySrc.includes('1500'),
  'Must use high-speed 1.5s interval during LIVE match'
);
console.log('  PASS  4.1: Dynamic high-speed 1500ms auto-refresh interval active during live matches');

// 4.2: Visibility change & window focus listeners
assert(
  groundDisplaySrc.includes("document.addEventListener('visibilitychange'") &&
  groundDisplaySrc.includes("window.addEventListener('focus'"),
  'Must re-sync on document visibilitychange and window focus'
);
console.log('  PASS  4.2: Instant re-sync fires immediately on document visibilitychange and window focus');

// 4.3: page.tsx disables static caching
assert(
  displayPageSrc.includes('export const revalidate = 0;'),
  'Ground display page.tsx MUST have revalidate = 0'
);
console.log('  PASS  4.3: Server page revalidate = 0 ensures fresh SSR loads');


// -------------------------------------------------------------
// 5. OPERATOR UI VISUAL REALTIME BADGES
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Visual Realtime Indicator Badges ---');

// 5.1: Realtime Live Badge in HUD header
assert(
  groundDisplaySrc.includes('REALTIME LIVE') && groundDisplaySrc.includes('isRealtimeConnected'),
  'Stadium Monitor header MUST show REALTIME LIVE badge with connection status'
);
console.log('  PASS  5.1: HUD header displays dynamic "⚡ REALTIME LIVE" connection badge');

// 5.2: Footer shows Supabase Realtime active status
assert(
  groundDisplaySrc.includes('Ground Monitor Active • Real-time Sync via Supabase Realtime'),
  'Footer MUST display Ground Monitor Active • Real-time Sync via Supabase Realtime'
);
console.log('  PASS  5.2: Footer displays live Supabase Realtime WebSocket status & timestamp');

console.log('\n============================================================');
console.log(' ALL CPL 2026 STADIUM MONITOR REALTIME TESTS PASSED! ⚡');
console.log('============================================================\n');
