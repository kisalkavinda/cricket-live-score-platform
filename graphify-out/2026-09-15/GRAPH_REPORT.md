# Graph Report - cricket-platform  (2026-09-14)

## Corpus Check
- 198 files · ~259,514 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1356 nodes · 2673 edges · 85 communities (68 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d0b649a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- players/page.tsx
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- group-stage-points-table.test.ts
- compilerOptions
- security-overhaul.test.js
- security-audit.test.js
- Phase 3 — Match Engine (Express + Cricket Engine)
- security-cache-scoring.test.js
- realtime-live-scoring.test.js
- scoring-rules-mcc.test.js
- test-google-sheets-connection.js
- web/vercel.json
- vercel.json
- SeamArc.tsx
- seed.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Cricket Tournament Platform — Full Consolidated Summary
- devDependencies
- package.json
- 🏏 Computing Premier League (CPL)
- AGENTS.md
- web/middleware.ts
- getMatchDetail
- admin-auth.ts
- admin-actions.ts
- normalizeImageUrl
- requireAdminAuth
- live-security-recheck.test.js
- nrr-softball.test.js
- registration-exceptions/page.tsx
- e2e-system-verification.test.js
- http-smoke-check.test.js
- offline-db.ts
- scratch_test_prisma.js
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- getAdminEntryPath
- nrr-engine.ts
- match-center-completed-priority.test.ts
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- offline-resilient-scoring.test.ts
- tournament-service.ts
- scorecard/route.ts
- admin-service.ts
- test-concurrency-deep-gate.ts
- scoring-actions.ts
- deleteMatchAction
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- players/[id]/page.tsx
- ping/route.ts
- update_sslmode.js
- sw.js
- retired-hurt-lifecycle.test.ts
- server-only
- image-proxy/route.ts
- scoring-service.ts
- generate-favicons.js
- registrations/page.tsx
- stadium-monitor-realtime.test.ts
- generate-favicons.ts

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 113 edges
2. `getAdminEntryPath()` - 71 edges
3. `prisma` - 37 edges
4. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
5. `ScoringConsole()` - 26 edges
6. `getMatchDetail()` - 26 edges
7. `normalizeImageUrl()` - 26 edges
8. `getTournamentOverview()` - 25 edges
9. `recordDelivery()` - 21 edges
10. `SyncEngine` - 19 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `recordDelivery()`  [EXTRACTED]
  apps/web/tests/test-concur-debug.ts → apps/web/lib/scoring/scoring-service.ts
- `AdminDashboardPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (85 total, 17 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.06
Nodes (64): RegisterPage(), dynamic, NewMatchPage(), dynamic, GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic (+56 more)

### Community 1 - "players/page.tsx"
Cohesion: 0.14
Nodes (22): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, getStageBadgeStyle(), MatchStageBadge() (+14 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.07
Nodes (32): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+24 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, @vercel/analytics, @vercel/speed-insights (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.07
Nodes (43): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+35 more)

### Community 6 - "group-stage-points-table.test.ts"
Cohesion: 0.15
Nodes (13): isSameGroupName(), normalizeGroupKey(), groundDisplayClientPath, groundDisplaySrc, liveScoreWidgetPath, liveScoreWidgetSrc, matches, matchStandings (+5 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 8 - "security-overhaul.test.js"
Cohesion: 0.05
Nodes (38): adminActionsPath, adminActionsSrc, adminValPath, adminValSrc, authSrc, crypto, expectedAdminMutations, expectedScoringMutations (+30 more)

### Community 9 - "security-audit.test.js"
Cohesion: 0.09
Nodes (20): adminActionNames, adminActionsFile, crypto, expectedSig, fs, isValid, libFiles, liveApiFile (+12 more)

### Community 10 - "Phase 3 — Match Engine (Express + Cricket Engine)"
Cohesion: 0.05
Nodes (42): Build Guide: Cricket Tournament Platform — Step-by-Step (for AI Coding Agent), Phase 0 — Repo & Project Scaffold, Phase 1 — Public Landing Page (Hero, Event Details, Registration), Phase 2 — Database & Core Entities, Phase 3 — Match Engine (Express + Cricket Engine), Phase 4 — Real-Time, Public Scorecards, Tournament Engine, Step 0.1 — Initialize monorepo, Step 0.2 — Create GitHub repo and push (+34 more)

### Community 11 - "security-cache-scoring.test.js"
Cohesion: 0.10
Nodes (15): actionsSrc, adminCatchAll, adminRootPage, authSrc, failures, fs, liveScore, nextConfig (+7 more)

### Community 12 - "realtime-live-scoring.test.js"
Cohesion: 0.15
Nodes (14): actionsSrc, assert(), failures, fs, has(), no(), path, realtimeSrc (+6 more)

### Community 13 - "scoring-rules-mcc.test.js"
Cohesion: 0.05
Nodes (37): allowedOnNbAndFh, allowedOnWide, assert, bye1, bye2, completedMatch, {
  computeStageStandings,
  calculateInningsEffectiveOvers,
  isInningsAllOut,
}, creditedWickets (+29 more)

### Community 14 - "test-google-sheets-connection.js"
Cohesion: 0.33
Nodes (3): fs, { google }, path

### Community 15 - "web/vercel.json"
Cohesion: 0.50
Nodes (3): sin1, regions, $schema

### Community 16 - "vercel.json"
Cohesion: 0.50
Nodes (3): sin1, regions, $schema

### Community 27 - "Cricket Tournament Platform — Full Consolidated Summary"
Cohesion: 0.05
Nodes (37): 10. Bowling Restrictions (original + addendum), 11. Free Hit — schema field, 12. Consecutive-Over Restriction — schema field, 13. Batting Order & Retired-Hurt Return (addendum, decided: scorer picks live), 14. Cricket Engine (dedicated package), 15. Row-Level Locking (addendum), 16. Single-Scorer-Per-Match Enforcement (addendum, decided: yes, exactly one), 17. Points, Standings, NRR, Qualification (+29 more)

### Community 28 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+11 more)

### Community 29 - "package.json"
Cohesion: 0.11
Nodes (17): dependencies, @lottiefiles/dotlottie-react, pg, devDependencies, puppeteer-core, @lottiefiles/dotlottie-react, name, private (+9 more)

### Community 30 - "🏏 Computing Premier League (CPL)"
Cohesion: 0.06
Nodes (32): 🏏 Computing Premier League — Web Application, 📦 Key Directory Map, 🌐 Live Production, 🚀 Quick Start for `apps/web`, 1. Clone the Repository, 1. ⚡ Mobile-First Live Scoring Console (`/[secretPath]/matches/[id]/score`), 2. Install Dependencies, 2. 📶 Offline-First Resilience & Sync Engine (`lib/offline/`) (+24 more)

### Community 35 - "getMatchDetail"
Cohesion: 0.18
Nodes (22): dynamic, fetchFreshLiveMatches(), GET(), GroundDisplayPage(), metadata, revalidate, broadcastScoreUpdate(), sortMatchesByPriority() (+14 more)

### Community 36 - "admin-auth.ts"
Cohesion: 0.13
Nodes (21): ManagementLayout(), AdminLoginClient(), SecretAdminEntryPage(), AdminNavLinks(), AdminNavLinksProps, loginAdminServerAction(), logoutAdminServerAction(), createSessionToken() (+13 more)

### Community 37 - "admin-actions.ts"
Cohesion: 0.13
Nodes (19): NewTournamentPage(), handleSubmit(), DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, createExceptionServerAction(), createTournamentServerAction(), deleteTournamentServerAction() (+11 more)

### Community 38 - "normalizeImageUrl"
Cohesion: 0.06
Nodes (39): GroundDisplayClient(), Props, ScorecardContent(), NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), Props (+31 more)

### Community 39 - "requireAdminAuth"
Cohesion: 0.14
Nodes (25): Props, ScoringConsole(), handleDeleteBall(), handleSaveEditedBall(), handleSaveMatchRules(), handleSaveRenamePlayer(), handleStartSuperOver(), handleUndoSuperOver() (+17 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (31): assert, emptyStandings, eval10OverAllOut, eval6OverAllOut, evalAllOut, evalNotAllOut13, evalNotAllOut37, formatMatrix (+23 more)

### Community 42 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 43 - "e2e-system-verification.test.js"
Cohesion: 0.25
Nodes (8): assert(), envFiles, errors, fs, path, prisma, { PrismaClient }, runE2EVerification()

### Community 44 - "http-smoke-check.test.js"
Cohesion: 0.43
Nodes (6): assert(), errors, get(), http, post(), runHttpCheck()

### Community 45 - "offline-db.ts"
Cohesion: 0.07
Nodes (40): clearCompletedOperations(), CURRENT_PAYLOAD_VERSION, DB_NAME, DB_VERSION, enqueueOperation(), getAllOperationsForMatch(), getAuthoritativeSnapshot(), getNextClientSequence() (+32 more)

### Community 46 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "getAdminEntryPath"
Cohesion: 0.15
Nodes (19): dynamic, TeamDetailPage(), dynamic, TournamentDetailPage(), ManagementLayout(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps (+11 more)

### Community 51 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (9): calculateInningsEffectiveOvers(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData, sortStandingsWithTieBreakers() (+1 more)

### Community 52 - "match-center-completed-priority.test.ts"
Cohesion: 0.12
Nodes (14): broadcastCompleted, broadcastLive, broadcastUpcoming, completedMatch1, completedMatch2, list1, list2, newlyStartedLiveMatch (+6 more)

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "offline-resilient-scoring.test.ts"
Cohesion: 0.15
Nodes (15): changeBowler(), swapStriker(), switchBatter(), undoLastDelivery(), cleanupAllFixtures(), cleanupFixture(), createdFixtures, createTestFixture() (+7 more)

### Community 60 - "tournament-service.ts"
Cohesion: 0.11
Nodes (47): dynamic, fetchFreshStats(), GET(), AdminTournamentBracketPage(), TournamentAdminConsole(), TournamentPage(), advanceTournamentAction(), assignTeamsToGroupsAction() (+39 more)

### Community 61 - "scorecard/route.ts"
Cohesion: 0.19
Nodes (15): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, getCachedScorecard(), getCoalescedMatchScorecard(), inFlightRequests, MAX_SCORECARD_CACHE_ENTRIES, pruneExpiredCache() (+7 more)

### Community 62 - "admin-service.ts"
Cohesion: 0.21
Nodes (15): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, approveRegistrationServerAction(), rejectRegistrationServerAction(), retryBackupServerAction(), approveRegistrationTransaction(), DashboardStats (+7 more)

### Community 63 - "test-concurrency-deep-gate.ts"
Cohesion: 0.52
Nodes (6): cleanupFixture(), createDisposableFixture(), Fixture, runDeepConcurrencyGate(), sleep(), withRetry()

### Community 64 - "scoring-actions.ts"
Cohesion: 0.14
Nodes (19): NewMatchForm(), Props, Team, Tournament, createMatchAction(), createMatch(), changeBowlerSchema, completeMatchSchema (+11 more)

### Community 65 - "deleteMatchAction"
Cohesion: 0.50
Nodes (4): DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction()

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 69 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 76 - "retired-hurt-lifecycle.test.ts"
Cohesion: 0.06
Nodes (48): BallTimelineFilter(), BallTimelineFilterProps, HeadToHeadBoundaryCounter(), LiveEquationTicker(), LiveEquationTickerProps, ChartMode, MatchWormChart(), MatchWormChartProps (+40 more)

### Community 78 - "image-proxy/route.ts"
Cohesion: 0.47
Nodes (5): ALLOWED_HOSTS, dynamic, GET(), isAllowedHost(), isPrivateIpOrLocalhost()

### Community 85 - "scoring-service.ts"
Cohesion: 0.17
Nodes (25): applyOperationToProjection(), BOWLER_CREDITED_WICKETS, calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult, ExtraTypeValue (+17 more)

### Community 86 - "generate-favicons.js"
Cohesion: 0.47
Nodes (5): fs, buildFavicons(), createIco(), path, sharp

### Community 87 - "registrations/page.tsx"
Cohesion: 0.31
Nodes (7): AdminRegistrationsPage(), dynamic, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, deleteRegistrationServerAction(), getRegistrationsList()

### Community 89 - "stadium-monitor-realtime.test.ts"
Cohesion: 0.18
Nodes (10): displayPageSrc, groundDisplayClientPath, groundDisplayPagePath, groundDisplaySrc, liveMatchesRoutePath, liveMatchesSrc, realtimeSrc, scoringRealtimePath (+2 more)

### Community 90 - "generate-favicons.ts"
Cohesion: 0.67
Nodes (3): ImageEntry, buildFavicons(), createIco()

## Knowledge Gaps
- **597 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+592 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `index.ts` to `players/page.tsx`, `admin-actions.ts`, `players/[id]/page.tsx`, `RegistrationForm.tsx`, `registration-exceptions/page.tsx`, `getAdminEntryPath`, `scoring-service.ts`, `offline-resilient-scoring.test.ts`, `tournament-service.ts`, `scorecard/route.ts`, `admin-service.ts`, `test-concurrency-deep-gate.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `index.ts`, `players/page.tsx`, `scoring-actions.ts`, `deleteMatchAction`, `admin-auth.ts`, `players/[id]/page.tsx`, `admin-actions.ts`, `normalizeImageUrl`, `getMatchDetail`, `registration-exceptions/page.tsx`, `getAdminEntryPath`, `scoring-service.ts`, `registrations/page.tsx`, `offline-resilient-scoring.test.ts`, `tournament-service.ts`, `admin-service.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `normalizeImageUrl()` connect `normalizeImageUrl` to `players/page.tsx`, `getMatchDetail`, `admin-actions.ts`, `getAdminEntryPath`, `scoring-service.ts`, `tournament-service.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _597 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05642633228840126 - nodes in this community are weakly interconnected._
- **Should `players/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06654567453115548 - nodes in this community are weakly interconnected._