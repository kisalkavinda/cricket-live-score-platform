# Graph Report - cricket-platform  (2026-08-30)

## Corpus Check
- 103 files · ~94,047 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 643 nodes · 1193 edges · 34 communities (28 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f4e2c96a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-actions.ts
- requireAdminAuth
- app/page.tsx
- dependencies
- database/package.json
- RegistrationForm.tsx
- getAdminEntryPath
- compilerOptions
- admin-service.ts
- security-audit.test.js
- Phase 3 — Match Engine (Express + Cricket Engine)
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
- Cricket Tournament Platform — Full Consolidated Summary
- devDependencies
- package.json
- README.md
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `requireAdminAuth()` - 84 edges
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
- `AdminDashboardPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/dashboard/page.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `getAdminEntryPath()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `ManagementLayout()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/layout.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminScoringPage()` --calls--> `requireAdminAuth()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/matches/[id]/score/page.tsx → apps/web/lib/auth/admin-auth.ts
- `AdminScoringPage()` --calls--> `getMatchDetail()`  [EXTRACTED]
  apps/web/app/[secretPath]/(admin)/matches/[id]/score/page.tsx → apps/web/lib/scoring/scoring-service.ts

## Import Cycles
- None detected.

## Communities (34 total, 6 thin omitted)

### Community 0 - "admin-actions.ts"
Cohesion: 0.06
Nodes (41): ManagementLayout(), dynamic, RegistrationExceptionsPage(), dynamic, TeamDetailPage(), NewTournamentPage(), handleSubmit(), AdminLoginClient() (+33 more)

### Community 1 - "requireAdminAuth"
Cohesion: 0.08
Nodes (63): dynamic, GET(), scorecardCache, dynamic, GET(), dynamic, GET(), NewMatchForm() (+55 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.08
Nodes (27): barlowCondensed, inter, jetbrainsMono, metadata, viewport, metadata, dynamic, metadata (+19 more)

### Community 3 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, database, googleapis, @hookform/resolvers, @lottiefiles/dotlottie-react, next, react, react-dom (+17 more)

### Community 4 - "database/package.json"
Cohesion: 0.08
Nodes (24): dependencies, prisma, @prisma/client, ts-node, @types/node, typescript, description, exports (+16 more)

### Community 5 - "RegistrationForm.tsx"
Cohesion: 0.11
Nodes (26): POST(), ConfirmationChecklist(), ConfirmationChecklistProps, FormError(), FormErrorProps, PlayerList(), PlayerListProps, PlayerRow() (+18 more)

### Community 6 - "getAdminEntryPath"
Cohesion: 0.07
Nodes (57): RegisterPage(), robots(), AdminDashboardPage(), dynamic, AdminScoringPage(), dynamic, dynamic, NewMatchPage() (+49 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 8 - "admin-service.ts"
Cohesion: 0.10
Nodes (31): AdminRegistrationDetailPage(), RegistrationDetailClient(), RegistrationDetailClientProps, DeleteRegistrationButton(), handleDelete(), DeleteRegistrationButtonProps, approveRegistrationServerAction(), deleteRegistrationServerAction() (+23 more)

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

### Community 13 - "createClient"
Cohesion: 0.23
Nodes (10): ScorecardContent(), NewPlayerPage(), handleSubmit(), NewTeamPage(), handleSubmit(), LiveScoreWidget(), NavTab, createPlayerServerAction() (+2 more)

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
Cohesion: 0.07
Nodes (27): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss, @types/node, @types/react (+19 more)

### Community 29 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, @lottiefiles/dotlottie-react, pg, @lottiefiles/dotlottie-react, name, private, scripts, build (+6 more)

### Community 30 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **271 isolated node(s):** `dynamic`, `dynamic`, `Tournament`, `Team`, `Props` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireAdminAuth()` connect `requireAdminAuth` to `admin-actions.ts`, `admin-service.ts`, `createClient`, `getAdminEntryPath`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `prisma` connect `getAdminEntryPath` to `admin-actions.ts`, `admin-service.ts`, `RegistrationForm.tsx`, `requireAdminAuth`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `getAdminEntryPath()` connect `getAdminEntryPath` to `admin-actions.ts`, `admin-service.ts`, `createClient`, `requireAdminAuth`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `Tournament` to the rest of the system?**
  _271 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06485671191553545 - nodes in this community are weakly interconnected._
- **Should `requireAdminAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.08034061458718993 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._