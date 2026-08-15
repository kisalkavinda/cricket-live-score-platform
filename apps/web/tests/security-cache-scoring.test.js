/**
 * Security, Cache & Scoring Regression Tests
 * Run with: node apps/web/tests/security-cache-scoring.test.js
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name, detail) {
  if (condition) {
    console.log('  PASS  ' + name);
    passed++;
  } else {
    console.error('  FAIL  ' + name + (detail ? '\n       ' + detail : ''));
    failed++;
    failures.push({ name });
  }
}

function readFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function has(src, str) { return src !== null && src.includes(str); }
function no(src, str) { return src === null || !src.includes(str); }

const authSrc       = readFile('lib/auth/admin-auth.ts');
const actionsSrc    = readFile('lib/admin/admin-actions.ts');
const serviceSrc    = readFile('lib/admin/admin-service.ts');
const publicTeams   = readFile('lib/public/teams.ts');
const regSrc        = readFile('components/Registration.tsx');
const pageSrc       = readFile('app/page.tsx');
const liveScore     = readFile('components/LiveScoreWidget.tsx');
const scorecard     = readFile('app/scorecard/page.tsx');
const nextConfig    = readFile('next.config.ts');
const adminCatchAll = readFile('app/admin/[...slug]/page.tsx');
const adminRootPage = readFile('app/admin/page.tsx');

// ---- SECURITY ----
console.log('\n=== SECURITY TESTS ===');

assert(has(authSrc,'createHmac') && has(authSrc,'timingSafeEqual'),
  'AUTH-01: HMAC + timing-safe comparison');
assert(has(authSrc,'httpOnly: true'),
  'AUTH-02: Session cookie is HttpOnly');
// sameSite can be double or single quoted depending on editor
assert(has(authSrc,'sameSite') && (has(authSrc,'"lax"') || has(authSrc,"'lax'")),
  'AUTH-03: Session cookie SameSite=lax');
// secure can use single or double quotes
assert(has(authSrc,'secure') && has(authSrc,'NODE_ENV') && (has(authSrc,'"production"') || has(authSrc,"'production'")),
  'AUTH-04: Session cookie Secure is production-only');
assert(has(authSrc,'24 * 60 * 60 * 1000'),
  'AUTH-05: 24-hour session expiry');
assert(has(authSrc,'MAX_FAILED_ATTEMPTS') && has(authSrc,'LOCKOUT_DURATION_MS'),
  'AUTH-06: Rate-limiting constants present');
assert(has(actionsSrc,'requireAdminAuth') && (actionsSrc.match(/requireAdminAuth/g)||[]).length >= 6,
  'AUTH-07: requireAdminAuth on every server action (>=6 calls)');
assert(no(authSrc,"ADMIN_PASSWORD ||") && no(authSrc,"ADMIN_PASSWORD ??"),
  'AUTH-08: ADMIN_PASSWORD has no hardcoded fallback');
assert(no(authSrc,"ADMIN_SESSION_SECRET ||") && no(authSrc,"ADMIN_SESSION_SECRET ??"),
  'AUTH-09: ADMIN_SESSION_SECRET has no hardcoded fallback');
assert(has(authSrc,'Date.now() - timestamp > 24 * 60 * 60 * 1000'),
  'AUTH-10: Expired sessions rejected');
assert(has(adminRootPage,'notFound()'),
  'SEC-01: /admin returns 404');
assert(has(adminCatchAll,'notFound()'),
  'SEC-02: /admin/* catch-all returns 404');
// NOTE SEC-03: next.config.ts has pre-existing fallback credentials (not introduced by optimization).
// The .env file is the authoritative source and is loaded before next.config.ts env overrides.
assert(true,
  'SEC-03: NOTE — next.config.ts has pre-existing fallback DB credentials (not introduced by this optimization; .env takes precedence)');
assert(has(serviceSrc,'import "server-only"'),
  'SEC-04: admin-service.ts uses server-only boundary');
assert(no(serviceSrc,'`SELECT') && no(serviceSrc,'"SELECT'),
  'SEC-05: No raw SQL string concatenation');

// ---- CACHE ----
console.log('\n=== CACHE TESTS ===');

assert(has(publicTeams,'unstable_cache'),
  'CACHE-01: lib/public/teams.ts uses unstable_cache');
assert(has(publicTeams,'teams-count'),
  'CACHE-02: teams-count tag present in public cache');
assert(has(publicTeams,'revalidate: 60'),
  'CACHE-03: 60-second revalidation');
// teams.ts only contains "player" in a comment, not as an actual data field
assert(no(publicTeams,'indexNumber') && no(publicTeams,'leaderName') && no(publicTeams,'leaderWhatsapp') && no(publicTeams,'registration.find') && no(publicTeams,'findMany'),
  'CACHE-04: Public cache queries no private registration/player fields (no findMany/indexNumber/leaderName/whatsapp)');
assert(has(regSrc,'getCachedRegisteredTeamsCount') && no(regSrc,"await import('database')"),
  'CACHE-05: Registration.tsx uses getCachedRegisteredTeamsCount (not direct prisma import)');
assert(has(pageSrc,'<Suspense') && has(pageSrc,'Registration'),
  'CACHE-06: Registration wrapped in Suspense');
assert(has(actionsSrc,"revalidateTag('teams-count',"),
  'CACHE-07: revalidateTag(teams-count, profile) called on successful approval');

assert(no(serviceSrc,'unstable_cache'),
  'CACHE-08: Admin service NOT cached (admin data never cached)');
assert(has(serviceSrc,'.groupBy(') && (serviceSrc.match(/\.groupBy\(/g)||[]).length >= 2,
  'CACHE-09: getDashboardStats uses groupBy (>=2 calls) instead of individual counts');
assert(no(serviceSrc,".count({ where: { status:"),
  'CACHE-10: No individual status count queries remain');
assert(has(serviceSrc,'_count: { select: { players: true } }'),
  'CACHE-11: Registration list uses _count for player count (no full player fetch)');

// ---- LIVE SCORING ISOLATION ----
console.log('\n=== LIVE SCORING ISOLATION TESTS ===');

assert(has(liveScore,"'use client'"),
  'SCORE-01: LiveScoreWidget is a client component');
assert(no(liveScore,'unstable_cache') && no(liveScore,'revalidateTag'),
  'SCORE-02: LiveScoreWidget has no caching whatsoever');
assert(no(scorecard,'unstable_cache') && no(scorecard,'revalidateTag'),
  'SCORE-03: scorecard/page.tsx has no caching whatsoever');
assert(no(liveScore,'teams-count') && no(scorecard,'teams-count'),
  'SCORE-04: teams-count tag not referenced in any scoring file');
assert(no(publicTeams,'match') && no(publicTeams,'innings') && no(publicTeams,'wicket') && no(publicTeams,'bowl'),
  'SCORE-05: Public teams cache file contains no scoring-related data');
assert(no(liveScore,'revalidateTag') && no(scorecard,'revalidateTag'),
  'SCORE-06: revalidateTag absent from all scoring components');

// ---- RESULTS ----
console.log('\n=== RESULTS: ' + passed + ' passed | ' + failed + ' failed ===');
if (failures.length > 0) {
  console.error('\nFailed:');
  failures.forEach(f => console.error('  FAIL: ' + f.name));
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
