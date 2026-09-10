# Graph Report - cricket-platform  (2026-09-10)

## Corpus Check
- 181 files · ~207,561 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1188 nodes · 2370 edges · 78 communities (60 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a76b4f4d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
- admin-auth.ts
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- normalizeImageUrl
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
- README.md
- AGENTS.md
- web/middleware.ts
- requireAdminAuth
- getAdminEntryPath
- scoring/ScoringConsole.tsx
- admin-actions.ts
- live-security-recheck.test.js
- nrr-softball.test.js
- scoring-actions.ts
- e2e-system-verification.test.js
- http-smoke-check.test.js
- offline-db.ts
- offline-resilient-scoring.test.ts
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- match-analytics.ts
- security-regression-suite.test.ts
- index.ts
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring-service.ts
- tournament-service.ts
- nrr-engine.ts
- admin-service.ts
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- test-concurrency-deep-gate.ts
- ping/route.ts
- update_sslmode.js
- sw.js
- players/[id]/page.tsx
- server-only
- image-proxy/route.ts
- getMatchDetail
- deleteMatchAction

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 112 edges
2. `getAdminEntryPath()` - 72 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 33 edges
5. `ScoringConsole()` - 25 edges
6. `getMatchDetail()` - 24 edges
7. `recordDelivery()` - 21 edges
8. `normalizeImageUrl()` - 20 edges
9. `SyncEngine` - 19 edges
10. `notifyMatchUpdated()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `resetTournamentAction()` --calls--> `resetTournamentFixtures()`  [EXTRACTED]
  apps/web/lib/tournament/tournament-actions.ts → apps/web/lib/tournament/tournament-service.ts
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

## Communities (78 total, 18 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.08
Nodes (54): GroupDrawAdminConsole(), Props, DrawCeremonyClient(), Props, dynamic, metadata, PublicTournamentDrawPage(), adminSelectChitAction() (+46 more)

### Community 1 - "admin-auth.ts"
Cohesion: 0.13
Nodes (21): ManagementLayout(), AdminLoginClient(), SecretAdminEntryPage(), AdminNavLinks(), AdminNavLinksProps, loginAdminServerAction(), logoutAdminServerAction(), createSessionToken() (+13 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.07
Nodes (31): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+23 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, @vercel/analytics, @vercel/speed-insights (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.07
Nodes (42): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+34 more)

### Community 6 - "normalizeImageUrl"
Cohesion: 0.14
Nodes (22): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic (+14 more)

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
Cohesion: 0.06
Nodes (35): BOWLER_CREDITED_WICKETS, allowedOnNbAndFh, allowedOnWide, assert, bye1, bye2, completedMatch, {
  computeStageStandings,
  calculateInningsEffectiveOvers,
  isInningsAllOut,
} (+27 more)

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
Cohesion: 0.13
Nodes (14): dependencies, @lottiefiles/dotlottie-react, pg, @lottiefiles/dotlottie-react, name, private, scripts, build (+6 more)

### Community 30 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 36 - "requireAdminAuth"
Cohesion: 0.17
Nodes (18): dynamic, TeamDetailPage(), dynamic, TournamentDetailPage(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton() (+10 more)

### Community 37 - "getAdminEntryPath"
Cohesion: 0.25
Nodes (15): robots(), AdminTournamentBracketPage(), dynamic, TournamentAdminConsole(), ManagementLayout(), getAdminEntryPath(), advanceTournamentAction(), assignTeamsToGroupsAction() (+7 more)

### Community 38 - "scoring/ScoringConsole.tsx"
Cohesion: 0.14
Nodes (16): Props, ScoringConsole(), handleSaveEditedBall(), handleSaveMatchRules(), handleStartSuperOver(), handleUpdateBallsPerOver(), changeBowlerAction(), editBallDeliveryAction() (+8 more)

### Community 39 - "admin-actions.ts"
Cohesion: 0.08
Nodes (32): dynamic, RegistrationExceptionsPage(), NewTournamentPage(), handleSubmit(), DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, ExceptionCard() (+24 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (31): assert, emptyStandings, eval10OverAllOut, eval6OverAllOut, evalAllOut, evalNotAllOut13, evalNotAllOut37, formatMatrix (+23 more)

### Community 42 - "scoring-actions.ts"
Cohesion: 0.14
Nodes (21): NewMatchForm(), Props, Team, Tournament, createMatchAction(), startMatchAction(), createMatch(), startMatch() (+13 more)

### Community 43 - "e2e-system-verification.test.js"
Cohesion: 0.25
Nodes (8): assert(), envFiles, errors, fs, path, prisma, { PrismaClient }, runE2EVerification()

### Community 44 - "http-smoke-check.test.js"
Cohesion: 0.43
Nodes (6): assert(), errors, get(), http, post(), runHttpCheck()

### Community 45 - "offline-db.ts"
Cohesion: 0.11
Nodes (28): clearCompletedOperations(), CURRENT_PAYLOAD_VERSION, DB_NAME, DB_VERSION, enqueueOperation(), getAllOperationsForMatch(), getAuthoritativeSnapshot(), getNextClientSequence() (+20 more)

### Community 46 - "offline-resilient-scoring.test.ts"
Cohesion: 0.23
Nodes (11): swapStrikerAction(), swapStriker(), cleanupAllFixtures(), cleanupFixture(), createdFixtures, createTestFixture(), Fixture, logFail() (+3 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "match-analytics.ts"
Cohesion: 0.09
Nodes (37): ScorecardContent(), NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), BallTimelineFilter(), BallTimelineFilterProps, HeadToHeadBoundaryCounter() (+29 more)

### Community 51 - "security-regression-suite.test.ts"
Cohesion: 0.13
Nodes (19): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, getClientIp(), getCachedScorecard(), getCoalescedMatchScorecard(), inFlightRequests, MAX_SCORECARD_CACHE_ENTRIES (+11 more)

### Community 52 - "index.ts"
Cohesion: 0.17
Nodes (7): dynamic, NewMatchPage(), AdminTournamentDrawPage(), dynamic, runRlsAdversarialGate(), globalForPrisma, prisma

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring-service.ts"
Cohesion: 0.16
Nodes (26): applyOperationToProjection(), computeLocalProjection(), calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult, ExtraTypeValue (+18 more)

### Community 60 - "tournament-service.ts"
Cohesion: 0.07
Nodes (41): dynamic, fetchFreshStats(), GET(), Props, FixturesAndResultsSection(), FixturesAndResultsSectionProps, GroupStandingsSection(), GroupStandingsSectionProps (+33 more)

### Community 61 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (10): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+2 more)

### Community 62 - "admin-service.ts"
Cohesion: 0.13
Nodes (22): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, AdminRegistrationsPage(), dynamic, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps (+14 more)

### Community 65 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 69 - "test-concurrency-deep-gate.ts"
Cohesion: 0.46
Nodes (7): undoLastDelivery(), cleanupFixture(), createDisposableFixture(), Fixture, runDeepConcurrencyGate(), sleep(), withRetry()

### Community 76 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 80 - "getMatchDetail"
Cohesion: 0.13
Nodes (23): dynamic, fetchFreshLiveMatches(), GET(), handleDeleteBall(), handleSaveRenamePlayer(), handleUndoSuperOver(), completeMatchAction(), deleteBallDeliveryAction() (+15 more)

### Community 81 - "deleteMatchAction"
Cohesion: 0.50
Nodes (4): DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction()

## Knowledge Gaps
- **493 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+488 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `draw-service.ts`, `admin-auth.ts`, `getAdminEntryPath`, `normalizeImageUrl`, `admin-actions.ts`, `scoring/ScoringConsole.tsx`, `test-concurrency-deep-gate.ts`, `scoring-actions.ts`, `players/[id]/page.tsx`, `offline-db.ts`, `offline-resilient-scoring.test.ts`, `getMatchDetail`, `deleteMatchAction`, `match-analytics.ts`, `security-regression-suite.test.ts`, `index.ts`, `scoring-service.ts`, `admin-service.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `draw-service.ts`, `requireAdminAuth`, `getAdminEntryPath`, `normalizeImageUrl`, `admin-actions.ts`, `RegistrationForm.tsx`, `test-concurrency-deep-gate.ts`, `players/[id]/page.tsx`, `offline-resilient-scoring.test.ts`, `security-regression-suite.test.ts`, `scoring-service.ts`, `tournament-service.ts`, `admin-service.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `normalizeImageUrl()` connect `normalizeImageUrl` to `requireAdminAuth`, `admin-actions.ts`, `getMatchDetail`, `scoring-service.ts`, `tournament-service.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _493 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08234126984126984 - nodes in this community are weakly interconnected._
- **Should `admin-auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._