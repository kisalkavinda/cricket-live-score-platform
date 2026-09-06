# Graph Report - cricket-platform  (2026-09-06)

## Corpus Check
- 162 files · ~170,542 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1093 nodes · 2134 edges · 76 communities (60 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0380e9fb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
- scoring-service.ts
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- createPerfTracker
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
- admin-auth.ts
- nrr-engine.ts
- requireAdminAuth
- registration-exceptions/page.tsx
- admin-actions.ts
- live-security-recheck.test.js
- nrr-softball.test.js
- admin-service.ts
- e2e-system-verification.test.js
- http-smoke-check.test.js
- offline-db.ts
- tournament-service.ts
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- index.ts
- scoring/ScoringConsole.tsx
- @hookform/resolvers
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring-actions.ts
- security-regression-suite.test.ts
- recordDelivery
- scoring-rules.ts
- draw-engine.test.js
- tournaments/page.tsx
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- (admin)/layout.tsx
- deleteMatchAction
- ping/route.ts
- update_sslmode.js
- sw.js

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 107 edges
2. `getAdminEntryPath()` - 71 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 31 edges
5. `ScoringConsole()` - 22 edges
6. `getMatchDetail()` - 22 edges
7. `recordDelivery()` - 22 edges
8. `SyncEngine` - 19 edges
9. `buildMatchBroadcastPayload()` - 18 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboardPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminScoringPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/matches/[id]/score/page.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (76 total, 16 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.11
Nodes (45): GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic, DrawCeremonyClient(), Props, PublicTournamentDrawPage(), adminSelectChitAction() (+37 more)

### Community 1 - "scoring-service.ts"
Cohesion: 0.15
Nodes (27): dynamic, GET(), broadcastScoreUpdate(), ScoreBroadcastPayload, ExtraTypeValue, isFreeHitActive(), WicketTypeValue, buildMatchBroadcastPayload() (+19 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.06
Nodes (39): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+31 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, googleapis, @lottiefiles/dotlottie-react, next, react, server-only, @vercel/speed-insights (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.08
Nodes (37): ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow(), PlayerRowProps (+29 more)

### Community 6 - "createPerfTracker"
Cohesion: 0.16
Nodes (20): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic (+12 more)

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
Nodes (31): allowedOnNbAndFh, allowedOnWide, assert, bye1, bye2, completedMatch, {
  computeStageStandings,
  calculateInningsEffectiveOvers,
  isInningsAllOut,
}, creditedWickets (+23 more)

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

### Community 35 - "admin-auth.ts"
Cohesion: 0.13
Nodes (23): POST(), AdminLoginClient(), SecretAdminEntryPage(), loginAdminServerAction(), createSessionToken(), getAdminSecrets(), getAdminSession, getClientIp() (+15 more)

### Community 36 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (10): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+2 more)

### Community 37 - "requireAdminAuth"
Cohesion: 0.15
Nodes (23): robots(), dynamic, NewMatchPage(), dynamic, TeamDetailPage(), AdminTournamentBracketPage(), dynamic, dynamic (+15 more)

### Community 38 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 39 - "admin-actions.ts"
Cohesion: 0.12
Nodes (20): NewTournamentPage(), handleSubmit(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, createExceptionServerAction(), createTeamServerAction(), createTournamentServerAction() (+12 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (31): assert, emptyStandings, eval10OverAllOut, eval6OverAllOut, evalAllOut, evalNotAllOut13, evalNotAllOut37, formatMatrix (+23 more)

### Community 42 - "admin-service.ts"
Cohesion: 0.15
Nodes (19): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction() (+11 more)

### Community 43 - "e2e-system-verification.test.js"
Cohesion: 0.25
Nodes (8): assert(), envFiles, errors, fs, path, prisma, { PrismaClient }, runE2EVerification()

### Community 44 - "http-smoke-check.test.js"
Cohesion: 0.43
Nodes (6): assert(), errors, get(), http, post(), runHttpCheck()

### Community 45 - "offline-db.ts"
Cohesion: 0.11
Nodes (27): clearCompletedOperations(), CURRENT_PAYLOAD_VERSION, DB_NAME, DB_VERSION, enqueueOperation(), getAllOperationsForMatch(), getAuthoritativeSnapshot(), getNextClientSequence() (+19 more)

### Community 46 - "tournament-service.ts"
Cohesion: 0.11
Nodes (34): dynamic, GET(), Props, TournamentAdminConsole(), MobileTournamentHub(), MobileTournamentHubProps, TournamentPage(), Props (+26 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "index.ts"
Cohesion: 0.15
Nodes (12): AdminPlayerDetailPage(), dynamic, dynamic, metadata, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction() (+4 more)

### Community 51 - "scoring/ScoringConsole.tsx"
Cohesion: 0.15
Nodes (20): Props, ScoringConsole(), handleDeleteBall(), handleSaveEditedBall(), handleStartSuperOver(), handleUpdateBallsPerOver(), changeBowlerAction(), completeMatchAction() (+12 more)

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring-actions.ts"
Cohesion: 0.15
Nodes (18): NewMatchForm(), Props, Team, Tournament, createMatchAction(), createMatch(), changeBowlerSchema, completeMatchSchema (+10 more)

### Community 60 - "security-regression-suite.test.ts"
Cohesion: 0.16
Nodes (13): dynamic, GET(), pruneExpiredCache(), sanitizePublicScorecard(), scorecardCache, changeBowler(), getPublicMatchScorecard(), switchBatter() (+5 more)

### Community 61 - "recordDelivery"
Cohesion: 0.19
Nodes (15): recordDelivery(), undoLastDelivery(), createTestFixture(), Fixture, logFail(), logPass(), path, runTestSuite() (+7 more)

### Community 62 - "scoring-rules.ts"
Cohesion: 0.30
Nodes (12): applyOperationToProjection(), computeLocalProjection(), BOWLER_CREDITED_WICKETS, calculateBowlerMaidens(), calculateBowlerRunsFromDelivery(), calculateDeliveryRuns(), calculateMaidensMap(), DeliveryRunsResult (+4 more)

### Community 63 - "draw-engine.test.js"
Cohesion: 0.24
Nodes (9): assert, crypto, envFiles, fs, hashPasscode(), path, { prisma }, runDrawEngineTests() (+1 more)

### Community 64 - "tournaments/page.tsx"
Cohesion: 0.31
Nodes (7): AdminTournamentsPage(), dynamic, getTournaments(), DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, deleteTournamentServerAction()

### Community 65 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 68 - "(admin)/layout.tsx"
Cohesion: 0.40
Nodes (4): ManagementLayout(), AdminNavLinks(), AdminNavLinksProps, logoutAdminServerAction()

### Community 69 - "deleteMatchAction"
Cohesion: 0.50
Nodes (4): DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction()

## Knowledge Gaps
- **471 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+466 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `draw-service.ts`, `tournaments/page.tsx`, `scoring-service.ts`, `admin-auth.ts`, `(admin)/layout.tsx`, `deleteMatchAction`, `registration-exceptions/page.tsx`, `createPerfTracker`, `admin-actions.ts`, `admin-service.ts`, `tournament-service.ts`, `index.ts`, `scoring/ScoringConsole.tsx`, `scoring-actions.ts`, `security-regression-suite.test.ts`, `recordDelivery`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `draw-service.ts`, `tournaments/page.tsx`, `scoring-service.ts`, `requireAdminAuth`, `registration-exceptions/page.tsx`, `createPerfTracker`, `admin-actions.ts`, `RegistrationForm.tsx`, `admin-service.ts`, `tournament-service.ts`, `security-regression-suite.test.ts`, `recordDelivery`, `draw-engine.test.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `getInningsWicketLimit()` connect `scoring-rules.ts` to `scoring-service.ts`, `nrr-engine.ts`, `scoring-rules-mcc.test.js`, `tournament-service.ts`, `scoring/ScoringConsole.tsx`, `recordDelivery`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11103047895500726 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05698778833107191 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._