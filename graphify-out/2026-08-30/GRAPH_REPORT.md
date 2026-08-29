# Graph Report - cricket-platform  (2026-08-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 548 nodes · 1108 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f4e2c96a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireAdminAuth
- scoring-service.ts
- app/page.tsx
- dependencies
- devDependencies
- RegistrationForm.tsx
- createPerfTracker
- compilerOptions
- admin-service.ts
- security-audit.test.js
- admin-auth.ts
- security-cache-scoring.test.js
- realtime-live-scoring.test.js
- createClient
- test-google-sheets-connection.js
- web/vercel.json
- vercel.json
- SeamArc.tsx
- seed.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 84 edges
2. `getAdminEntryPath()` - 58 edges
3. `getMatchDetail()` - 20 edges
4. `ScoringConsole()` - 17 edges
5. `buildMatchBroadcastPayload()` - 17 edges
6. `compilerOptions` - 16 edges
7. `broadcastScoreUpdate()` - 15 edges
8. `createPerfTracker()` - 15 edges
9. `logPerfMetric()` - 15 edges
10. `RegistrationFormData` - 14 edges

## Surprising Connections (you probably didn't know these)
- `robots()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/robots.ts → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `ConfirmationChecklistProps` --references--> `RegistrationFormData`  [EXTRACTED]
  apps/web/components/registration/ConfirmationChecklist.tsx → apps/web/lib/validations/registration.ts
- `PlayerListProps` --references--> `RegistrationFormData`  [EXTRACTED]
  apps/web/components/registration/PlayerList.tsx → apps/web/lib/validations/registration.ts
- `PlayerRowProps` --references--> `RegistrationFormData`  [EXTRACTED]
  apps/web/components/registration/PlayerRow.tsx → apps/web/lib/validations/registration.ts

## Import Cycles
- None detected.

## Communities (27 total, 5 thin omitted)

### Community 0 - "requireAdminAuth"
Cohesion: 0.06
Nodes (69): ManagementLayout(), dynamic, NewMatchPage(), AdminPlayerDetailPage(), dynamic, dynamic, RegistrationExceptionsPage(), RegistrationDetailClient() (+61 more)

### Community 1 - "scoring-service.ts"
Cohesion: 0.07
Nodes (65): dynamic, GET(), scorecardCache, dynamic, GET(), dynamic, GET(), NewMatchForm() (+57 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.08
Nodes (28): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+20 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, database, googleapis, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, react-dom (+38 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (40): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+32 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.11
Nodes (26): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+18 more)

### Community 6 - "createPerfTracker"
Cohesion: 0.14
Nodes (23): AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, AdminMatchesPage(), dynamic, AdminPlayersPage(), dynamic (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 8 - "admin-service.ts"
Cohesion: 0.17
Nodes (20): AdminRegistrationDetailPage(), approveRegistrationTransaction(), DashboardStats, getRegistrationDetail(), matchesIntakeOrIndex(), matchesRegistrationException(), RegistrationsQuery, verifyApprovalPreflight() (+12 more)

### Community 9 - "security-audit.test.js"
Cohesion: 0.09
Nodes (20): adminActionNames, adminActionsFile, crypto, expectedSig, fs, isValid, libFiles, liveApiFile (+12 more)

### Community 10 - "admin-auth.ts"
Cohesion: 0.18
Nodes (15): robots(), AdminLoginClient(), ManagementLayout(), SecretAdminEntryPage(), loginAdminServerAction(), checkRateLimit(), createSessionToken(), getAdminSecrets() (+7 more)

### Community 11 - "security-cache-scoring.test.js"
Cohesion: 0.10
Nodes (15): actionsSrc, adminCatchAll, adminRootPage, authSrc, failures, fs, liveScore, nextConfig (+7 more)

### Community 12 - "realtime-live-scoring.test.js"
Cohesion: 0.15
Nodes (14): actionsSrc, assert(), failures, fs, has(), no(), path, realtimeSrc (+6 more)

### Community 13 - "createClient"
Cohesion: 0.22
Nodes (9): ScorecardContent(), NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), LiveScoreWidget(), NavTab, ScoreBroadcastPayload (+1 more)

### Community 14 - "test-google-sheets-connection.js"
Cohesion: 0.33
Nodes (3): fs, { google }, path

### Community 15 - "web/vercel.json"
Cohesion: 0.50
Nodes (3): sin1, regions, $schema

### Community 16 - "vercel.json"
Cohesion: 0.50
Nodes (3): sin1, regions, $schema

## Knowledge Gaps
- **189 isolated node(s):** `RegistrationDetailClientProps`, `AdminNavLinksProps`, `DeletePlayerButtonProps`, `DeleteRegistrationButtonProps`, `DeleteTeamButtonProps` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `admin-service.ts`, `scoring-service.ts`, `admin-auth.ts`, `createPerfTracker`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `prisma` connect `requireAdminAuth` to `admin-service.ts`, `scoring-service.ts`, `RegistrationForm.tsx`, `createPerfTracker`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getAdminEntryPath()` connect `requireAdminAuth` to `admin-service.ts`, `scoring-service.ts`, `admin-auth.ts`, `createPerfTracker`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `RegistrationDetailClientProps`, `AdminNavLinksProps`, `DeletePlayerButtonProps` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireAdminAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.059370725034199726 - nodes in this community are weakly interconnected._
- **Should `scoring-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0681081081081081 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._