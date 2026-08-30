# Graph Report - cricket-platform  (2026-08-30)

## Corpus Check
- 109 files · ~98,393 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 720 nodes · 1294 edges · 46 communities (35 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b1f3c78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-service.ts
- scoring-actions.ts
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- index.ts
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
- requireAdminAuth
- getAdminEntryPath
- admin-actions.ts
- registration-exceptions/page.tsx
- backup-sync.ts
- web/package.json
- (admin)/layout.tsx
- @lottiefiles/dotlottie-react
- next
- @supabase/ssr
- @vercel/speed-insights

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 85 edges
2. `getAdminEntryPath()` - 58 edges
3. `Cricket Tournament Platform — Full Consolidated Summary` - 34 edges
4. `getMatchDetail()` - 20 edges
5. `ScoringConsole()` - 17 edges
6. `buildMatchBroadcastPayload()` - 17 edges
7. `compilerOptions` - 16 edges
8. `broadcastScoreUpdate()` - 15 edges
9. `createPerfTracker()` - 15 edges
10. `logPerfMetric()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `handleDelete()` --calls--> `deleteTournamentServerAction()`  [EXTRACTED]
  apps/web/components/admin/DeleteTournamentButton.tsx → apps/web/lib/admin/admin-actions.ts
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

## Communities (46 total, 11 thin omitted)

### Community 0 - "admin-service.ts"
Cohesion: 0.15
Nodes (19): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction() (+11 more)

### Community 1 - "scoring-actions.ts"
Cohesion: 0.06
Nodes (76): dynamic, GET(), pruneExpiredCache(), scorecardCache, dynamic, GET(), dynamic, GET() (+68 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.06
Nodes (37): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+29 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, database, googleapis, @hookform/resolvers, react, react-dom, react-hook-form, @supabase/supabase-js (+9 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.09
Nodes (30): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+22 more)

### Community 6 - "index.ts"
Cohesion: 0.10
Nodes (30): AdminDashboardPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic, getPlayers(), AdminRegistrationsPage() (+22 more)

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
Cohesion: 0.20
Nodes (16): AdminLoginClient(), SecretAdminEntryPage(), loginAdminServerAction(), createSessionToken(), getAdminSecrets(), getAdminSession, getClientIp(), hashToken() (+8 more)

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

### Community 35 - "requireAdminAuth"
Cohesion: 0.15
Nodes (18): dynamic, NewMatchPage(), AdminPlayerDetailPage(), dynamic, dynamic, TournamentDetailPage(), DeletePlayerButton(), handleDelete() (+10 more)

### Community 36 - "getAdminEntryPath"
Cohesion: 0.17
Nodes (16): robots(), dynamic, TeamDetailPage(), ManagementLayout(), DeleteTeamButton(), handleDelete(), DeleteTeamButtonProps, RemovePlayerFromTeamButton() (+8 more)

### Community 37 - "admin-actions.ts"
Cohesion: 0.18
Nodes (14): NewTournamentPage(), handleSubmit(), createExceptionServerAction(), createTournamentServerAction(), createException(), createExceptionSchema, createPlayerSchema, createTeamSchema (+6 more)

### Community 38 - "registration-exceptions/page.tsx"
Cohesion: 0.20
Nodes (12): dynamic, RegistrationExceptionsPage(), ExceptionCard(), handleDelete(), handleToggle(), handleUpdate(), ExceptionCardProps, deleteExceptionServerAction() (+4 more)

### Community 39 - "backup-sync.ts"
Cohesion: 0.30
Nodes (12): recordFailedBackup(), retryRegistrationBackup(), sanitizeErrorMessage(), syncRegistrationToGoogleSheets(), SyncResult, getGoogleSheetsClient(), getGoogleSheetsConfig(), getSpreadsheetId() (+4 more)

### Community 40 - "web/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 41 - "(admin)/layout.tsx"
Cohesion: 0.40
Nodes (4): ManagementLayout(), AdminNavLinks(), AdminNavLinksProps, logoutAdminServerAction()

## Knowledge Gaps
- **319 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `admin-service.ts`, `scoring-actions.ts`, `getAdminEntryPath`, `admin-actions.ts`, `registration-exceptions/page.tsx`, `index.ts`, `(admin)/layout.tsx`, `admin-auth.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `prisma` connect `index.ts` to `admin-service.ts`, `scoring-actions.ts`, `requireAdminAuth`, `getAdminEntryPath`, `admin-actions.ts`, `registration-exceptions/page.tsx`, `backup-sync.ts`, `RegistrationForm.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `getAdminEntryPath()` connect `getAdminEntryPath` to `admin-service.ts`, `scoring-actions.ts`, `requireAdminAuth`, `admin-actions.ts`, `index.ts`, `registration-exceptions/page.tsx`, `(admin)/layout.tsx`, `admin-auth.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _319 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scoring-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05616509926854754 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05952380952380952 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._