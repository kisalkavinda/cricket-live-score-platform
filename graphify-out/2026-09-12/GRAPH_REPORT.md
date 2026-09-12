# Graph Report - cricket-platform  (2026-09-12)

## Corpus Check
- 190 files · ~239,058 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 2543 edges · 94 communities (77 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a0e77b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
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
- README.md
- AGENTS.md
- web/middleware.ts
- players/[id]/page.tsx
- offline-resilient-scoring.test.ts
- scorecard/route.ts
- TournamentHubClient.tsx
- requireAdminAuth
- live-security-recheck.test.js
- nrr-softball.test.js
- scoring-actions.ts
- e2e-system-verification.test.js
- http-smoke-check.test.js
- scoring/ScoringConsole.tsx
- getMatchDetail
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- match-analytics.ts
- nrr-engine.ts
- match-center-completed-priority.test.ts
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring-rules.ts
- tournament-service.ts
- undoLastDelivery
- normalizeImageUrl
- admin-auth.ts
- admin-actions.ts
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- getAdminEntryPath
- ping/route.ts
- update_sslmode.js
- sw.js
- retired-hurt-lifecycle.test.ts
- server-only
- image-proxy/route.ts
- DeleteTournamentButton.tsx
- split-over-injury-bowler.test.ts
- draw-engine.test.js
- index.ts
- scorecard/page.tsx
- scoring-service.ts
- generate-favicons.js
- matches/page.tsx
- createClient
- stadium-monitor-realtime.test.ts
- generate-favicons.ts
- security-regression-suite.test.ts
- stats/route.ts
- GroupStandingsSection.tsx

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 112 edges
2. `getAdminEntryPath()` - 70 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 33 edges
5. `ScoringConsole()` - 26 edges
6. `getMatchDetail()` - 26 edges
7. `normalizeImageUrl()` - 25 edges
8. `recordDelivery()` - 21 edges
9. `SyncEngine` - 19 edges
10. `calculateDeliveryRuns()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `TournamentPage()` --calls--> `getTournamentOverview()`  [EXTRACTED]
  apps/web/app/tournament/page.tsx → apps/web/lib/tournament/tournament-service.ts
- `handleStartSuperOver()` --calls--> `startSuperOverAction()`  [EXTRACTED]
  apps/web/components/scoring/ScoringConsole.tsx → apps/web/lib/scoring/scoring-actions.ts
- `handleUndoSuperOver()` --calls--> `undoSuperOverAction()`  [EXTRACTED]
  apps/web/components/scoring/ScoringConsole.tsx → apps/web/lib/scoring/scoring-actions.ts
- `handleSaveRenamePlayer()` --calls--> `renamePlayerAction()`  [EXTRACTED]
  apps/web/components/scoring/ScoringConsole.tsx → apps/web/lib/scoring/scoring-actions.ts
- `handleSaveEditedBall()` --calls--> `editBallDeliveryAction()`  [EXTRACTED]
  apps/web/components/scoring/ScoringConsole.tsx → apps/web/lib/scoring/scoring-actions.ts

## Import Cycles
- None detected.

## Communities (94 total, 17 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.10
Nodes (47): GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic, DrawCeremonyClient(), Props, dynamic, metadata (+39 more)

### Community 1 - "players/page.tsx"
Cohesion: 0.16
Nodes (20): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminPlayersPage(), dynamic, getPlayers(), AdminRegistrationsPage() (+12 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.07
Nodes (33): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+25 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, @vercel/analytics, @vercel/speed-insights (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.07
Nodes (44): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+36 more)

### Community 6 - "group-stage-points-table.test.ts"
Cohesion: 0.17
Nodes (11): groundDisplayClientPath, groundDisplaySrc, liveScoreWidgetPath, liveScoreWidgetSrc, matches, matchStandings, matchTeams, standings (+3 more)

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
Cohesion: 0.13
Nodes (14): dependencies, @lottiefiles/dotlottie-react, pg, @lottiefiles/dotlottie-react, name, private, scripts, build (+6 more)

### Community 30 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 35 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 36 - "offline-resilient-scoring.test.ts"
Cohesion: 0.26
Nodes (10): swapStriker(), cleanupAllFixtures(), cleanupFixture(), createdFixtures, createTestFixture(), Fixture, logFail(), logPass() (+2 more)

### Community 37 - "scorecard/route.ts"
Cohesion: 0.19
Nodes (15): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, getCachedScorecard(), getCoalescedMatchScorecard(), inFlightRequests, MAX_SCORECARD_CACHE_ENTRIES, pruneExpiredCache() (+7 more)

### Community 38 - "TournamentHubClient.tsx"
Cohesion: 0.13
Nodes (14): Props, FixturesAndResultsSection(), FixturesAndResultsSectionProps, PlayoffQualificationFlow(), PlayoffQualificationFlowProps, TournamentHeroHUD(), TournamentHeroHUDProps, TournamentMetricsGrid() (+6 more)

### Community 39 - "requireAdminAuth"
Cohesion: 0.19
Nodes (14): NewMatchForm(), Props, Team, Tournament, requireAdminAuth(), createMatchAction(), deleteBallDeliveryAction(), renamePlayerAction() (+6 more)

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

### Community 45 - "scoring/ScoringConsole.tsx"
Cohesion: 0.07
Nodes (45): Props, ScoringConsole(), handleDeleteBall(), handleSaveEditedBall(), handleSaveMatchRules(), handleSaveRenamePlayer(), handleStartSuperOver(), handleUndoSuperOver() (+37 more)

### Community 46 - "getMatchDetail"
Cohesion: 0.20
Nodes (20): dynamic, fetchFreshLiveMatches(), GET(), GroundDisplayPage(), metadata, revalidate, broadcastScoreUpdate(), sortMatchesByPriority() (+12 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "match-analytics.ts"
Cohesion: 0.22
Nodes (18): BallTimelineFilter(), BallTimelineFilterProps, BallFilterMode, BoundaryComparison, calculateBoundaryComparison(), ChaseEquation, computeInningsAnalytics(), computeInningsSummary() (+10 more)

### Community 51 - "nrr-engine.ts"
Cohesion: 0.22
Nodes (13): GroundDisplayClient(), calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), isSameGroupName() (+5 more)

### Community 52 - "match-center-completed-priority.test.ts"
Cohesion: 0.12
Nodes (14): broadcastCompleted, broadcastLive, broadcastUpcoming, completedMatch1, completedMatch2, list1, list2, newlyStartedLiveMatch (+6 more)

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring-rules.ts"
Cohesion: 0.32
Nodes (11): applyOperationToProjection(), BOWLER_CREDITED_WICKETS, calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult, getInningsWicketLimit() (+3 more)

### Community 60 - "tournament-service.ts"
Cohesion: 0.15
Nodes (30): AdminTournamentBracketPage(), dynamic, TournamentAdminConsole(), advanceTournamentAction(), assignTeamsToGroupsAction(), configureTournamentStagesAction(), generateGroupFixturesAction(), recalculateStandingsAction() (+22 more)

### Community 61 - "undoLastDelivery"
Cohesion: 0.46
Nodes (7): undoLastDelivery(), cleanupFixture(), createDisposableFixture(), Fixture, runDeepConcurrencyGate(), sleep(), withRetry()

### Community 62 - "normalizeImageUrl"
Cohesion: 0.24
Nodes (9): Props, LiveOrNextMatchSpotlight(), LiveOrNextMatchSpotlightProps, PlayoffBracketTree(), PlayoffBracketTreeProps, LiveScoreWidget(), NavTab, ScoreBroadcastPayload (+1 more)

### Community 63 - "admin-auth.ts"
Cohesion: 0.18
Nodes (17): AdminLoginClient(), SecretAdminEntryPage(), loginAdminServerAction(), createSessionToken(), getAdminSecrets(), getAdminSession, getEnvValue(), hashToken() (+9 more)

### Community 64 - "admin-actions.ts"
Cohesion: 0.05
Nodes (58): dynamic, RegistrationExceptionsPage(), AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, dynamic, TeamDetailPage(), NewTournamentPage() (+50 more)

### Community 65 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 69 - "getAdminEntryPath"
Cohesion: 0.21
Nodes (11): ManagementLayout(), dynamic, TournamentDetailPage(), ManagementLayout(), AdminNavLinks(), AdminNavLinksProps, addTournamentStageServerAction(), logoutAdminServerAction() (+3 more)

### Community 76 - "retired-hurt-lifecycle.test.ts"
Cohesion: 0.10
Nodes (18): afterUndoBowled, afterUndoRH, analytics, battingScores, bowledBadge, fowRetired, fowWickets, mockBallEvents (+10 more)

### Community 78 - "image-proxy/route.ts"
Cohesion: 0.47
Nodes (5): ALLOWED_HOSTS, dynamic, GET(), isAllowedHost(), isPrivateIpOrLocalhost()

### Community 79 - "DeleteTournamentButton.tsx"
Cohesion: 0.50
Nodes (4): DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, deleteTournamentServerAction()

### Community 81 - "split-over-injury-bowler.test.ts"
Cohesion: 0.15
Nodes (13): computeLocalProjection(), baseMatch, bScoreA, bScoreB, changeBowlerOp(), inn3, inn4, inn5 (+5 more)

### Community 82 - "draw-engine.test.js"
Cohesion: 0.24
Nodes (9): assert, crypto, envFiles, fs, hashPasscode(), path, { prisma }, runDrawEngineTests() (+1 more)

### Community 83 - "index.ts"
Cohesion: 0.19
Nodes (6): dynamic, NewMatchPage(), runRlsAdversarialGate(), main(), globalForPrisma, prisma

### Community 84 - "scorecard/page.tsx"
Cohesion: 0.19
Nodes (10): ScorecardContent(), HeadToHeadBoundaryCounter(), LiveEquationTicker(), LiveEquationTickerProps, ChartMode, MatchWormChart(), MatchWormChartProps, calculateChaseEquation() (+2 more)

### Community 85 - "scoring-service.ts"
Cohesion: 0.24
Nodes (12): editBallDeliveryAction(), ExtraTypeValue, isFreeHitActive(), validateDismissalLegality(), WicketTypeValue, editBallDelivery(), InningsStatusType, MatchStatusType (+4 more)

### Community 86 - "generate-favicons.js"
Cohesion: 0.47
Nodes (5): fs, buildFavicons(), createIco(), path, sharp

### Community 87 - "matches/page.tsx"
Cohesion: 0.31
Nodes (7): AdminMatchesPage(), dynamic, DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction(), getMatchesList()

### Community 88 - "createClient"
Cohesion: 0.33
Nodes (7): NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), createPlayerServerAction(), createTeamServerAction(), createClient()

### Community 89 - "stadium-monitor-realtime.test.ts"
Cohesion: 0.18
Nodes (10): displayPageSrc, groundDisplayClientPath, groundDisplayPagePath, groundDisplaySrc, liveMatchesRoutePath, liveMatchesSrc, realtimeSrc, scoringRealtimePath (+2 more)

### Community 90 - "generate-favicons.ts"
Cohesion: 0.67
Nodes (3): ImageEntry, buildFavicons(), createIco()

### Community 91 - "security-regression-suite.test.ts"
Cohesion: 0.32
Nodes (4): changeBowler(), switchBatter(), envPath, runSecurityRegressionSuite()

### Community 92 - "stats/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, fetchFreshStats(), GET()

### Community 93 - "GroupStandingsSection.tsx"
Cohesion: 0.67
Nodes (3): GroupStandingsSection(), GroupStandingsSectionProps, TeamStanding

## Knowledge Gaps
- **564 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+559 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `index.ts` to `admin-actions.ts`, `players/page.tsx`, `draw-service.ts`, `players/[id]/page.tsx`, `offline-resilient-scoring.test.ts`, `getAdminEntryPath`, `RegistrationForm.tsx`, `scorecard/route.ts`, `draw-engine.test.js`, `scoring-service.ts`, `security-regression-suite.test.ts`, `tournament-service.ts`, `undoLastDelivery`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `admin-actions.ts`, `players/page.tsx`, `draw-service.ts`, `players/[id]/page.tsx`, `offline-resilient-scoring.test.ts`, `getAdminEntryPath`, `scoring-actions.ts`, `scoring/ScoringConsole.tsx`, `getMatchDetail`, `DeleteTournamentButton.tsx`, `index.ts`, `scoring-service.ts`, `matches/page.tsx`, `createClient`, `security-regression-suite.test.ts`, `tournament-service.ts`, `undoLastDelivery`, `admin-auth.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `isBowlerCreditedDismissal()` connect `scoring-rules.ts` to `retired-hurt-lifecycle.test.ts`, `scoring/ScoringConsole.tsx`, `scoring-rules-mcc.test.js`, `match-analytics.ts`, `scoring-service.ts`, `undoLastDelivery`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _564 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06766917293233082 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._