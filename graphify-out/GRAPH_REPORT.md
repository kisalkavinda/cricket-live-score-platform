# Graph Report - cricket-platform  (2026-09-10)

## Corpus Check
- 183 files · ~213,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1197 nodes · 2411 edges · 78 communities (60 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e00a2d4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
- players/page.tsx
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- admin-auth.ts
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
- index.ts
- requireAdminAuth
- SyncEngine
- normalizeImageUrl
- registration-exceptions/page.tsx
- live-security-recheck.test.js
- nrr-softball.test.js
- scoring-actions.ts
- e2e-system-verification.test.js
- http-smoke-check.test.js
- offline-db.ts
- scoring-service.ts
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- match-analytics.ts
- nrr-engine.ts
- draw-engine.test.js
- @supabase/ssr
- react-dom
- react-hook-form
- @supabase/supabase-js
- mock-server-only.js
- scoring/ScoringConsole.tsx
- getAdminEntryPath
- NewMatchForm.tsx
- DeleteTournamentButton.tsx
- deleteMatchAction
- admin-actions.ts
- scratch_test_prisma.js
- test_pg_direct.js
- scratch_test_db.js
- googleapis
- ping/route.ts
- update_sslmode.js
- sw.js
- server-only
- image-proxy/route.ts
- players/[id]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 112 edges
2. `getAdminEntryPath()` - 72 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 33 edges
5. `ScoringConsole()` - 26 edges
6. `getMatchDetail()` - 26 edges
7. `normalizeImageUrl()` - 25 edges
8. `recordDelivery()` - 21 edges
9. `SyncEngine` - 19 edges
10. `getTournamentOverview()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `ScorecardContent()` --calls--> `createClient()`  [EXTRACTED]
  apps/web/app/scorecard/page.tsx → apps/web/utils/supabase/client.ts
- `main()` --calls--> `recordDelivery()`  [EXTRACTED]
  apps/web/tests/test-concur-debug.ts → apps/web/lib/scoring/scoring-service.ts
- `AdminDashboardPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (78 total, 18 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.11
Nodes (45): GroupDrawAdminConsole(), Props, DrawCeremonyClient(), Props, dynamic, metadata, PublicTournamentDrawPage(), adminSelectChitAction() (+37 more)

### Community 1 - "players/page.tsx"
Cohesion: 0.14
Nodes (23): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic (+15 more)

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
Nodes (43): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+35 more)

### Community 6 - "admin-auth.ts"
Cohesion: 0.13
Nodes (22): ManagementLayout(), AdminLoginClient(), SecretAdminEntryPage(), AdminNavLinks(), AdminNavLinksProps, loginAdminServerAction(), logoutAdminServerAction(), createSessionToken() (+14 more)

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

### Community 35 - "index.ts"
Cohesion: 0.14
Nodes (9): RegisterPage(), dynamic, NewMatchPage(), AdminTournamentDrawPage(), dynamic, runRlsAdversarialGate(), main(), globalForPrisma (+1 more)

### Community 36 - "requireAdminAuth"
Cohesion: 0.17
Nodes (18): dynamic, TeamDetailPage(), dynamic, TournamentDetailPage(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton() (+10 more)

### Community 37 - "SyncEngine"
Cohesion: 0.26
Nodes (3): getPendingOperations(), updateOperationStatus(), SyncEngine

### Community 38 - "normalizeImageUrl"
Cohesion: 0.07
Nodes (34): GroundDisplayClient(), Props, NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), Props, FixturesAndResultsSection() (+26 more)

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
Cohesion: 0.17
Nodes (22): clearCompletedOperations(), CURRENT_PAYLOAD_VERSION, DB_NAME, DB_VERSION, enqueueOperation(), getAllOperationsForMatch(), getAuthoritativeSnapshot(), getNextClientSequence() (+14 more)

### Community 46 - "scoring-service.ts"
Cohesion: 0.05
Nodes (83): dynamic, GET(), MAX_SCORECARD_CACHE_ENTRIES, dynamic, fetchFreshLiveMatches(), GET(), dynamic, fetchFreshStats() (+75 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "match-analytics.ts"
Cohesion: 0.13
Nodes (28): ScorecardContent(), BallTimelineFilter(), BallTimelineFilterProps, HeadToHeadBoundaryCounter(), LiveEquationTicker(), LiveEquationTickerProps, ChartMode, MatchWormChart() (+20 more)

### Community 51 - "nrr-engine.ts"
Cohesion: 0.27
Nodes (10): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+2 more)

### Community 52 - "draw-engine.test.js"
Cohesion: 0.24
Nodes (9): assert, crypto, envFiles, fs, hashPasscode(), path, { prisma }, runDrawEngineTests() (+1 more)

### Community 57 - "mock-server-only.js"
Cohesion: 0.40
Nodes (4): dns, envFiles, fs, path

### Community 59 - "scoring/ScoringConsole.tsx"
Cohesion: 0.12
Nodes (25): Props, ScoringConsole(), handleDeleteBall(), handleSaveEditedBall(), handleSaveMatchRules(), handleSaveRenamePlayer(), handleStartSuperOver(), handleUndoSuperOver() (+17 more)

### Community 60 - "getAdminEntryPath"
Cohesion: 0.13
Nodes (33): robots(), AdminTournamentBracketPage(), dynamic, TournamentAdminConsole(), ManagementLayout(), TournamentPage(), getAdminEntryPath(), advanceTournamentAction() (+25 more)

### Community 61 - "NewMatchForm.tsx"
Cohesion: 0.32
Nodes (7): NewMatchForm(), Props, Team, Tournament, createMatchAction(), startMatchAction(), createMatch()

### Community 62 - "DeleteTournamentButton.tsx"
Cohesion: 0.50
Nodes (4): DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, deleteTournamentServerAction()

### Community 63 - "deleteMatchAction"
Cohesion: 0.50
Nodes (4): DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction()

### Community 64 - "admin-actions.ts"
Cohesion: 0.09
Nodes (34): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, NewTournamentPage(), handleSubmit(), DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps (+26 more)

### Community 65 - "scratch_test_prisma.js"
Cohesion: 0.25
Nodes (6): env, fs, m, path, prisma, { PrismaClient }

### Community 66 - "test_pg_direct.js"
Cohesion: 0.29
Nodes (7): { Client }, directMatch, envContent, fs, main(), match, test()

### Community 67 - "scratch_test_db.js"
Cohesion: 0.29
Nodes (5): { Client }, env, fs, m, path

### Community 81 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

## Knowledge Gaps
- **495 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+490 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `admin-actions.ts`, `players/page.tsx`, `draw-service.ts`, `index.ts`, `admin-auth.ts`, `registration-exceptions/page.tsx`, `normalizeImageUrl`, `scoring-actions.ts`, `scoring-service.ts`, `players/[id]/page.tsx`, `scoring/ScoringConsole.tsx`, `getAdminEntryPath`, `NewMatchForm.tsx`, `DeleteTournamentButton.tsx`, `deleteMatchAction`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `draw-service.ts`, `players/page.tsx`, `admin-actions.ts`, `requireAdminAuth`, `RegistrationForm.tsx`, `registration-exceptions/page.tsx`, `scoring-service.ts`, `players/[id]/page.tsx`, `draw-engine.test.js`, `getAdminEntryPath`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `normalizeImageUrl()` connect `normalizeImageUrl` to `admin-actions.ts`, `players/page.tsx`, `requireAdminAuth`, `scoring-service.ts`, `getAdminEntryPath`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _495 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10957910014513789 - nodes in this community are weakly interconnected._
- **Should `players/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13763440860215054 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07138047138047138 - nodes in this community are weakly interconnected._