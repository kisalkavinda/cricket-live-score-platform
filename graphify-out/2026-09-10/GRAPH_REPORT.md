# Graph Report - cricket-platform  (2026-09-10)

## Corpus Check
- 173 files · ~209,990 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1164 nodes · 2329 edges · 80 communities (62 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b598238d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
- admin-auth.ts
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- players/page.tsx
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
- draw-engine.test.js
- admin-actions.ts
- getAdminEntryPath
- requireAdminAuth
- admin-service.ts
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
- scorecard/route.ts
- index.ts
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring-service.ts
- tournament-service.ts
- nrr-engine.ts
- scoring-rules.ts
- registration-exceptions/page.tsx
- stats/route.ts
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- createTournamentServerAction
- ping/route.ts
- update_sslmode.js
- sw.js
- players/[id]/page.tsx
- server-only
- image-proxy/route.ts
- recordDelivery

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 111 edges
2. `getAdminEntryPath()` - 71 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 33 edges
5. `ScoringConsole()` - 25 edges
6. `getMatchDetail()` - 24 edges
7. `recordDelivery()` - 21 edges
8. `SyncEngine` - 19 edges
9. `normalizeImageUrl()` - 17 edges
10. `notifyMatchUpdated()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `TournamentPage()` --calls--> `getTournamentOverview()`  [EXTRACTED]
  apps/web/app/tournament/page.tsx → apps/web/lib/tournament/tournament-service.ts
- `main()` --calls--> `recordDelivery()`  [EXTRACTED]
  apps/web/tests/test-concur-debug.ts → apps/web/lib/scoring/scoring-service.ts
- `resetTournamentAction()` --calls--> `resetTournamentFixtures()`  [EXTRACTED]
  apps/web/lib/tournament/tournament-actions.ts → apps/web/lib/tournament/tournament-service.ts
- `AdminDashboardPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (80 total, 18 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.10
Nodes (47): GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic, DrawCeremonyClient(), Props, dynamic, metadata (+39 more)

### Community 1 - "admin-auth.ts"
Cohesion: 0.10
Nodes (27): POST(), ManagementLayout(), AdminLoginClient(), SecretAdminEntryPage(), AdminNavLinks(), AdminNavLinksProps, loginAdminServerAction(), logoutAdminServerAction() (+19 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.05
Nodes (43): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+35 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, @vercel/analytics, @vercel/speed-insights (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.11
Nodes (25): ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow(), PlayerRowProps (+17 more)

### Community 6 - "players/page.tsx"
Cohesion: 0.10
Nodes (29): AdminDashboardPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic, getPlayers(), AdminRegistrationsPage() (+21 more)

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

### Community 35 - "draw-engine.test.js"
Cohesion: 0.24
Nodes (9): assert, crypto, envFiles, fs, hashPasscode(), path, { prisma }, runDrawEngineTests() (+1 more)

### Community 36 - "admin-actions.ts"
Cohesion: 0.11
Nodes (26): dynamic, TeamDetailPage(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton(), handleRemove(), RemovePlayerProps (+18 more)

### Community 37 - "getAdminEntryPath"
Cohesion: 0.20
Nodes (17): robots(), AdminTournamentBracketPage(), dynamic, TournamentAdminConsole(), dynamic, TournamentDetailPage(), ManagementLayout(), addTournamentStageServerAction() (+9 more)

### Community 38 - "requireAdminAuth"
Cohesion: 0.12
Nodes (29): NewMatchForm(), Props, Team, Tournament, Props, ScoringConsole(), handleSaveEditedBall(), handleSaveMatchRules() (+21 more)

### Community 39 - "admin-service.ts"
Cohesion: 0.10
Nodes (31): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction() (+23 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (31): assert, emptyStandings, eval10OverAllOut, eval6OverAllOut, evalAllOut, evalNotAllOut13, evalNotAllOut37, formatMatrix (+23 more)

### Community 42 - "scoring-actions.ts"
Cohesion: 0.22
Nodes (13): changeBowlerSchema, completeMatchSchema, createMatchSchema, editBallDeliverySchema, extraTypeEnum, openingLineupSchema, recordDeliverySchema, renamePlayerSchema (+5 more)

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
Cohesion: 0.14
Nodes (27): BallTimelineFilter(), BallTimelineFilterProps, HeadToHeadBoundaryCounter(), LiveEquationTicker(), LiveEquationTickerProps, ChartMode, MatchWormChart(), MatchWormChartProps (+19 more)

### Community 51 - "scorecard/route.ts"
Cohesion: 0.19
Nodes (15): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, getCachedScorecard(), getCoalescedMatchScorecard(), inFlightRequests, MAX_SCORECARD_CACHE_ENTRIES, pruneExpiredCache() (+7 more)

### Community 52 - "index.ts"
Cohesion: 0.17
Nodes (7): RegisterPage(), dynamic, NewMatchPage(), runRlsAdversarialGate(), main(), globalForPrisma, prisma

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring-service.ts"
Cohesion: 0.10
Nodes (33): dynamic, fetchFreshLiveMatches(), GET(), AdminScoringPage(), dynamic, handleDeleteBall(), handleSaveRenamePlayer(), handleUndoSuperOver() (+25 more)

### Community 60 - "tournament-service.ts"
Cohesion: 0.16
Nodes (23): Props, MobileTournamentHub(), MobileTournamentHubProps, Props, TeamStanding, assignTeamsToGroups(), checkAndAdvanceTournament(), configureTournamentStages() (+15 more)

### Community 61 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (10): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+2 more)

### Community 62 - "scoring-rules.ts"
Cohesion: 0.32
Nodes (11): applyOperationToProjection(), BOWLER_CREDITED_WICKETS, calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult, getInningsWicketLimit() (+3 more)

### Community 63 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 64 - "stats/route.ts"
Cohesion: 0.60
Nodes (4): dynamic, fetchFreshStats(), GET(), getTournamentStats()

### Community 65 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 69 - "createTournamentServerAction"
Cohesion: 0.67
Nodes (3): NewTournamentPage(), handleSubmit(), createTournamentServerAction()

### Community 76 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 80 - "recordDelivery"
Cohesion: 0.18
Nodes (13): changeBowlerAction(), validateDismissalLegality(), changeBowler(), recordDelivery(), undoLastDelivery(), envPath, runSecurityRegressionSuite(), cleanupFixture() (+5 more)

## Knowledge Gaps
- **487 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+482 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `draw-service.ts`, `admin-auth.ts`, `app/page.tsx`, `admin-actions.ts`, `getAdminEntryPath`, `players/page.tsx`, `admin-service.ts`, `createTournamentServerAction`, `scoring-actions.ts`, `players/[id]/page.tsx`, `offline-resilient-scoring.test.ts`, `recordDelivery`, `index.ts`, `scoring-service.ts`, `registration-exceptions/page.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `draw-service.ts`, `draw-engine.test.js`, `admin-actions.ts`, `getAdminEntryPath`, `players/page.tsx`, `admin-service.ts`, `RegistrationForm.tsx`, `players/[id]/page.tsx`, `offline-resilient-scoring.test.ts`, `recordDelivery`, `scorecard/route.ts`, `scoring-service.ts`, `tournament-service.ts`, `registration-exceptions/page.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `recordDelivery()` connect `recordDelivery` to `requireAdminAuth`, `scoring-actions.ts`, `offline-resilient-scoring.test.ts`, `index.ts`, `scoring-service.ts`, `tournament-service.ts`, `scoring-rules.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _487 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `admin-auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05289193302891933 - nodes in this community are weakly interconnected._