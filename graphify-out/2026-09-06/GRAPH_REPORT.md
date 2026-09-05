# Graph Report - cricket-platform  (2026-09-06)

## Corpus Check
- 134 files · ~148,464 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 921 nodes · 1743 edges · 60 communities (48 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e143a1f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draw-service.ts
- scoring-service.ts
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- requireAdminAuth
- compilerOptions
- security-overhaul.test.js
- security-audit.test.js
- Phase 3 — Match Engine (Express + Cricket Engine)
- security-cache-scoring.test.js
- realtime-live-scoring.test.js
- admin-auth.ts
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
- scoring-actions.ts
- admin-actions.ts
- scoring/ScoringConsole.tsx
- teams/[id]/page.tsx
- live-security-recheck.test.js
- nrr-softball.test.js
- registration-exceptions/page.tsx
- e2e-system-verification.test.js
- http-smoke-check.test.js
- backup-sync.ts
- tournament-service.ts
- inspect-and-clean-dummy-data.js
- manual-cookie-replay-test.js
- web/package.json
- admin-service.ts
- @lottiefiles/dotlottie-react
- next
- @supabase/ssr
- @vercel/speed-insights
- RegistrationDetailClient.tsx
- matches/new/page.tsx
- players/[id]/page.tsx
- scorecard/route.ts
- DeleteTournamentButton.tsx

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 107 edges
2. `getAdminEntryPath()` - 71 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `prisma` - 21 edges
5. `getMatchDetail()` - 20 edges
6. `buildMatchBroadcastPayload()` - 18 edges
7. `ScoringConsole()` - 17 edges
8. `compilerOptions` - 16 edges
9. `broadcastScoreUpdate()` - 15 edges
10. `generateDraw()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `robots()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/robots.ts → apps/web/lib/auth/admin-auth.ts
- `TournamentPage()` --calls--> `getTournamentOverview()`  [EXTRACTED]
  apps/web/app/tournament/page.tsx → apps/web/lib/tournament/tournament-service.ts
- `AdminScoringPage()` --calls--> `getMatchDetail()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/matches/[id]/score/page.tsx → apps/web/lib/scoring/scoring-service.ts
- `NewMatchPage()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/matches/new/page.tsx → apps/web/lib/auth/admin-auth.ts

## Import Cycles
- None detected.

## Communities (60 total, 12 thin omitted)

### Community 0 - "draw-service.ts"
Cohesion: 0.10
Nodes (47): GroupDrawAdminConsole(), Props, AdminTournamentDrawPage(), dynamic, DrawCeremonyClient(), Props, dynamic, metadata (+39 more)

### Community 1 - "scoring-service.ts"
Cohesion: 0.19
Nodes (27): dynamic, GET(), broadcastScoreUpdate(), buildMatchBroadcastPayload(), changeBowler(), completeMatch(), deleteBallDelivery(), editBallDelivery() (+19 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.05
Nodes (42): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+34 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, googleapis, @hookform/resolvers, react, react-dom, react-hook-form, @supabase/supabase-js (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.11
Nodes (25): ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow(), PlayerRowProps (+17 more)

### Community 6 - "requireAdminAuth"
Cohesion: 0.14
Nodes (32): AdminDashboardPage(), dynamic, ManagementLayout(), AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage() (+24 more)

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

### Community 13 - "admin-auth.ts"
Cohesion: 0.09
Nodes (28): POST(), robots(), AdminLoginClient(), ManagementLayout(), SecretAdminEntryPage(), AdminNavLinks(), AdminNavLinksProps, loginAdminServerAction() (+20 more)

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
Cohesion: 0.21
Nodes (10): assert, crypto, envFiles, fs, hashPasscode(), path, prisma, { PrismaClient } (+2 more)

### Community 36 - "scoring-actions.ts"
Cohesion: 0.13
Nodes (20): DeleteMatchButton(), handleDelete(), DeleteMatchButtonProps, deleteMatchAction(), CreateMatchInput, OpeningLineupInput, RecordDeliveryInput, StartMatchInput (+12 more)

### Community 37 - "admin-actions.ts"
Cohesion: 0.18
Nodes (14): NewTournamentPage(), handleSubmit(), createExceptionServerAction(), createTournamentServerAction(), createException(), createExceptionSchema, createPlayerSchema, createTeamSchema (+6 more)

### Community 38 - "scoring/ScoringConsole.tsx"
Cohesion: 0.15
Nodes (18): Props, ScoringConsole(), handleDeleteBall(), handleSaveEditedBall(), handleStartSuperOver(), handleUpdateBallsPerOver(), changeBowlerAction(), completeMatchAction() (+10 more)

### Community 39 - "teams/[id]/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, TeamDetailPage(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton(), handleRemove(), RemovePlayerProps (+4 more)

### Community 40 - "live-security-recheck.test.js"
Cohesion: 0.12
Nodes (12): authCode, crypto, envContent, envPath, errors, fs, match, mockRevokedDb (+4 more)

### Community 41 - "nrr-softball.test.js"
Cohesion: 0.06
Nodes (41): calculateInningsEffectiveOvers(), computeStageStandings(), countInningsLegalBalls(), formatDisplayCricketOvers(), InningsData, isInningsAllOut(), legalBallsToEffectiveOvers(), MatchData (+33 more)

### Community 42 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 43 - "e2e-system-verification.test.js"
Cohesion: 0.25
Nodes (8): assert(), envFiles, errors, fs, path, prisma, { PrismaClient }, runE2EVerification()

### Community 44 - "http-smoke-check.test.js"
Cohesion: 0.43
Nodes (6): assert(), errors, get(), http, post(), runHttpCheck()

### Community 45 - "backup-sync.ts"
Cohesion: 0.32
Nodes (11): recordFailedBackup(), sanitizeErrorMessage(), syncRegistrationToGoogleSheets(), SyncResult, getGoogleSheetsClient(), getGoogleSheetsConfig(), getSpreadsheetId(), GoogleSheetsConfig (+3 more)

### Community 46 - "tournament-service.ts"
Cohesion: 0.10
Nodes (38): dynamic, GET(), AdminTournamentBracketPage(), dynamic, Props, TournamentAdminConsole(), MobileTournamentHub(), MobileTournamentHubProps (+30 more)

### Community 48 - "manual-cookie-replay-test.js"
Cohesion: 0.33
Nodes (4): crypto, http, prisma, { PrismaClient }

### Community 49 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 50 - "admin-service.ts"
Cohesion: 0.30
Nodes (10): AdminRegistrationDetailPage(), approveRegistrationTransaction(), DashboardStats, getRegistrationDetail(), matchesIntakeOrIndex(), matchesRegistrationException(), RegistrationsQuery, retryBackupService() (+2 more)

### Community 55 - "RegistrationDetailClient.tsx"
Cohesion: 0.24
Nodes (10): RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction(), rejectRegistrationServerAction() (+2 more)

### Community 56 - "matches/new/page.tsx"
Cohesion: 0.24
Nodes (9): NewMatchForm(), Props, Team, Tournament, dynamic, NewMatchPage(), createMatchAction(), startMatchAction() (+1 more)

### Community 57 - "players/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): AdminPlayerDetailPage(), dynamic, DeletePlayerButton(), handleDelete(), DeletePlayerButtonProps, deletePlayerServerAction(), updatePlayerServerAction()

### Community 58 - "scorecard/route.ts"
Cohesion: 0.50
Nodes (4): dynamic, GET(), pruneExpiredCache(), scorecardCache

### Community 59 - "DeleteTournamentButton.tsx"
Cohesion: 0.50
Nodes (4): DeleteTournamentButton(), handleDelete(), DeleteTournamentButtonProps, deleteTournamentServerAction()

## Knowledge Gaps
- **404 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+399 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `draw-service.ts`, `scoring-service.ts`, `app/page.tsx`, `scoring-actions.ts`, `admin-actions.ts`, `scoring/ScoringConsole.tsx`, `teams/[id]/page.tsx`, `registration-exceptions/page.tsx`, `admin-auth.ts`, `tournament-service.ts`, `admin-service.ts`, `RegistrationDetailClient.tsx`, `matches/new/page.tsx`, `players/[id]/page.tsx`, `DeleteTournamentButton.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `prisma` connect `tournament-service.ts` to `draw-service.ts`, `scoring-service.ts`, `admin-actions.ts`, `requireAdminAuth`, `teams/[id]/page.tsx`, `RegistrationForm.tsx`, `registration-exceptions/page.tsx`, `backup-sync.ts`, `admin-service.ts`, `matches/new/page.tsx`, `players/[id]/page.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `getAdminEntryPath()` connect `requireAdminAuth` to `draw-service.ts`, `app/page.tsx`, `scoring-actions.ts`, `admin-actions.ts`, `teams/[id]/page.tsx`, `registration-exceptions/page.tsx`, `admin-auth.ts`, `tournament-service.ts`, `admin-service.ts`, `RegistrationDetailClient.tsx`, `matches/new/page.tsx`, `players/[id]/page.tsx`, `DeleteTournamentButton.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _404 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draw-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.054244306418219465 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._