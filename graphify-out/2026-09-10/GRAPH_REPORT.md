# Graph Report - cricket-platform  (2026-09-10)

## Corpus Check
- 183 files · ~212,864 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1196 nodes · 2407 edges · 85 communities (67 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14391633`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- players/page.tsx
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- getAdminEntryPath
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
- offline-resilient-scoring.test.ts
- teams/[id]/page.tsx
- scoring-service.ts
- TournamentHubClient.tsx
- registration-exceptions/page.tsx
- live-security-recheck.test.js
- nrr-softball.test.js
- scoring-actions.ts
- e2e-system-verification.test.js
- http-smoke-check.test.js
- offline-db.ts
- getMatchDetail
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- match-analytics.ts
- scorecard/route.ts
- requireAdminAuth
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring/ScoringConsole.tsx
- tournament-service.ts
- nrr-engine.ts
- admin-auth.ts
- display/page.tsx
- admin-actions.ts
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- test-concurrency-deep-gate.ts
- ping/route.ts
- update_sslmode.js
- sw.js
- RegistrationDetailClient.tsx
- server-only
- image-proxy/route.ts
- normalizeImageUrl
- admin-service.ts
- players/[id]/page.tsx
- (admin)/layout.tsx
- tournaments/[id]/page.tsx
- createTournamentServerAction

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 112 edges
2. `getAdminEntryPath()` - 72 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 33 edges
5. `getMatchDetail()` - 26 edges
6. `ScoringConsole()` - 25 edges
7. `normalizeImageUrl()` - 25 edges
8. `recordDelivery()` - 21 edges
9. `SyncEngine` - 19 edges
10. `getTournamentOverview()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TournamentPage()` --calls--> `getTournamentOverview()`  [EXTRACTED]
  apps/web/app/tournament/page.tsx → apps/web/lib/tournament/tournament-service.ts
- `resetTournamentAction()` --calls--> `resetTournamentFixtures()`  [EXTRACTED]
  apps/web/lib/tournament/tournament-actions.ts → apps/web/lib/tournament/tournament-service.ts
- `AdminDashboardPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (85 total, 18 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (59): GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic, DrawCeremonyClient(), Props, dynamic, metadata (+51 more)

### Community 1 - "players/page.tsx"
Cohesion: 0.10
Nodes (31): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic (+23 more)

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

### Community 6 - "getAdminEntryPath"
Cohesion: 0.25
Nodes (15): robots(), AdminTournamentBracketPage(), dynamic, TournamentAdminConsole(), ManagementLayout(), getAdminEntryPath(), advanceTournamentAction(), assignTeamsToGroupsAction() (+7 more)

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
Nodes (34): allowedOnNbAndFh, allowedOnWide, assert, bye1, bye2, completedMatch, {
  computeStageStandings,
  calculateInningsEffectiveOvers,
  isInningsAllOut,
}, creditedWickets (+26 more)

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

### Community 35 - "offline-resilient-scoring.test.ts"
Cohesion: 0.26
Nodes (10): swapStriker(), cleanupAllFixtures(), cleanupFixture(), createdFixtures, createTestFixture(), Fixture, logFail(), logPass() (+2 more)

### Community 36 - "teams/[id]/page.tsx"
Cohesion: 0.18
Nodes (13): dynamic, TeamDetailPage(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton(), handleRemove(), RemovePlayerProps (+5 more)

### Community 37 - "scoring-service.ts"
Cohesion: 0.18
Nodes (24): applyOperationToProjection(), computeLocalProjection(), BOWLER_CREDITED_WICKETS, calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult (+16 more)

### Community 38 - "TournamentHubClient.tsx"
Cohesion: 0.13
Nodes (14): Props, FixturesAndResultsSection(), FixturesAndResultsSectionProps, PlayoffQualificationFlow(), PlayoffQualificationFlowProps, TournamentHeroHUD(), TournamentHeroHUDProps, TournamentMetricsGrid() (+6 more)

### Community 39 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (31): assert, emptyStandings, eval10OverAllOut, eval6OverAllOut, evalAllOut, evalNotAllOut13, evalNotAllOut37, formatMatrix (+23 more)

### Community 42 - "scoring-actions.ts"
Cohesion: 0.17
Nodes (16): CreateMatchInput, OpeningLineupInput, StartMatchInput, changeBowlerSchema, completeMatchSchema, createMatchSchema, editBallDeliverySchema, extraTypeEnum (+8 more)

### Community 43 - "e2e-system-verification.test.js"
Cohesion: 0.25
Nodes (8): assert(), envFiles, errors, fs, path, prisma, { PrismaClient }, runE2EVerification()

### Community 44 - "http-smoke-check.test.js"
Cohesion: 0.43
Nodes (6): assert(), errors, get(), http, post(), runHttpCheck()

### Community 45 - "offline-db.ts"
Cohesion: 0.11
Nodes (27): clearCompletedOperations(), CURRENT_PAYLOAD_VERSION, DB_NAME, DB_VERSION, enqueueOperation(), getAllOperationsForMatch(), getAuthoritativeSnapshot(), getNextClientSequence() (+19 more)

### Community 46 - "getMatchDetail"
Cohesion: 0.17
Nodes (18): handleSaveRenamePlayer(), handleUndoSuperOver(), renamePlayerAction(), undoSuperOverAction(), broadcastScoreUpdate(), buildMatchBroadcastPayload(), changeBowler(), completeMatch() (+10 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "match-analytics.ts"
Cohesion: 0.08
Nodes (40): Props, ScorecardContent(), NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), BallTimelineFilter(), BallTimelineFilterProps (+32 more)

### Community 51 - "scorecard/route.ts"
Cohesion: 0.19
Nodes (15): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, getCachedScorecard(), getCoalescedMatchScorecard(), inFlightRequests, MAX_SCORECARD_CACHE_ENTRIES, pruneExpiredCache() (+7 more)

### Community 52 - "requireAdminAuth"
Cohesion: 0.16
Nodes (17): NewMatchForm(), Props, Team, Tournament, dynamic, NewMatchPage(), handleDeleteBall(), handleStartSuperOver() (+9 more)

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring/ScoringConsole.tsx"
Cohesion: 0.18
Nodes (15): Props, ScoringConsole(), handleSaveEditedBall(), handleSaveMatchRules(), handleUpdateBallsPerOver(), changeBowlerAction(), completeMatchAction(), editBallDeliveryAction() (+7 more)

### Community 60 - "tournament-service.ts"
Cohesion: 0.23
Nodes (17): assignTeamsToGroups(), checkAndAdvanceTournament(), configureTournamentStages(), createMatchRecord(), generateGroupStageFixtures(), getTournamentOverview(), recalculateTournamentStandings(), resetTournamentFixtures() (+9 more)

### Community 61 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (10): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+2 more)

### Community 62 - "admin-auth.ts"
Cohesion: 0.18
Nodes (17): AdminLoginClient(), SecretAdminEntryPage(), loginAdminServerAction(), createSessionToken(), getAdminSecrets(), getAdminSession, getClientIp(), getEnvValue() (+9 more)

### Community 63 - "display/page.tsx"
Cohesion: 0.19
Nodes (12): dynamic, fetchFreshLiveMatches(), GET(), dynamic, fetchFreshStats(), GET(), GroundDisplayClient(), GroundDisplayPage() (+4 more)

### Community 64 - "admin-actions.ts"
Cohesion: 0.22
Nodes (12): createExceptionServerAction(), createException(), createExceptionSchema, createPlayerSchema, createTeamSchema, createTournamentSchema, paginationSchema, playerRoleEnum (+4 more)

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

### Community 76 - "RegistrationDetailClient.tsx"
Cohesion: 0.24
Nodes (10): RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction(), rejectRegistrationServerAction() (+2 more)

### Community 79 - "normalizeImageUrl"
Cohesion: 0.27
Nodes (8): GroupStandingsSection(), GroupStandingsSectionProps, LiveOrNextMatchSpotlight(), LiveOrNextMatchSpotlightProps, PlayoffBracketTree(), PlayoffBracketTreeProps, TeamStanding, normalizeImageUrl()

### Community 80 - "admin-service.ts"
Cohesion: 0.38
Nodes (8): AdminRegistrationDetailPage(), approveRegistrationTransaction(), DashboardStats, getRegistrationDetail(), matchesIntakeOrIndex(), matchesRegistrationException(), RegistrationsQuery, verifyApprovalPreflight()

### Community 81 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 82 - "(admin)/layout.tsx"
Cohesion: 0.33
Nodes (5): ManagementLayout(), AdminNavLinks(), AdminNavLinksProps, logoutAdminServerAction(), logoutAdmin()

### Community 83 - "tournaments/[id]/page.tsx"
Cohesion: 0.60
Nodes (4): dynamic, TournamentDetailPage(), addTournamentStageServerAction(), updateTournamentServerAction()

### Community 84 - "createTournamentServerAction"
Cohesion: 0.67
Nodes (3): NewTournamentPage(), handleSubmit(), createTournamentServerAction()

## Knowledge Gaps
- **495 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+490 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `index.ts`, `players/page.tsx`, `getAdminEntryPath`, `offline-resilient-scoring.test.ts`, `teams/[id]/page.tsx`, `scoring-service.ts`, `registration-exceptions/page.tsx`, `scoring-actions.ts`, `getMatchDetail`, `match-analytics.ts`, `scoring/ScoringConsole.tsx`, `admin-auth.ts`, `admin-actions.ts`, `test-concurrency-deep-gate.ts`, `RegistrationDetailClient.tsx`, `admin-service.ts`, `players/[id]/page.tsx`, `(admin)/layout.tsx`, `tournaments/[id]/page.tsx`, `createTournamentServerAction`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `admin-actions.ts`, `players/page.tsx`, `offline-resilient-scoring.test.ts`, `teams/[id]/page.tsx`, `RegistrationForm.tsx`, `getAdminEntryPath`, `registration-exceptions/page.tsx`, `scoring-service.ts`, `test-concurrency-deep-gate.ts`, `getMatchDetail`, `admin-service.ts`, `players/[id]/page.tsx`, `tournaments/[id]/page.tsx`, `requireAdminAuth`, `scorecard/route.ts`, `tournament-service.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `normalizeImageUrl()` connect `normalizeImageUrl` to `admin-actions.ts`, `players/page.tsx`, `teams/[id]/page.tsx`, `scoring-service.ts`, `getMatchDetail`, `match-analytics.ts`, `tournament-service.ts`, `display/page.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _495 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06982456140350878 - nodes in this community are weakly interconnected._
- **Should `players/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0951219512195122 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06883116883116883 - nodes in this community are weakly interconnected._