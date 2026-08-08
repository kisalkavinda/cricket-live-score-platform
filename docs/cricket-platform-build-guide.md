# Build Guide: Cricket Tournament Platform — Step-by-Step (for AI Coding Agent)

This is written as an ordered execution plan. Each step is self-contained enough to hand to an agent one at a time, or run straight through. Steps are sequenced so the project is always in a working, deployable state — you get a live landing page with registration open in Step 1–4, before any scoring engine exists.

Reference docs for deeper detail on any step: `cricket-platform-blueprint-addendum.md` and `cricket-platform-full-summary.md`.

---

## Phase 0 — Repo & Project Scaffold

### Step 0.1 — Initialize monorepo

```bash
mkdir cricket-platform && cd cricket-platform
git init
npm init -y
```
github repo - https://github.com/kisalkavinda/cricket-live-score-platform

Create the folder structure:

```
cricket-platform/
├── apps/
│   ├── web/                 → Next.js (public + admin)
│   └── api/                 → Express (built later, Phase 2+)
├── packages/
│   ├── database/            → Prisma schema
│   ├── cricket-engine/      → scoring rules (built Phase 2+)
│   ├── shared-types/
│   └── validation/
├── package.json
└── README.md
```

Set up npm workspaces in the root `package.json`:

```json
{
  "name": "cricket-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

### Step 0.2 — Create GitHub repo and push

```bash
gh repo create cricket-platform --private --source=. --push
```

*(If `gh` isn't available, create the repo manually on GitHub and `git remote add origin <url>`.)*

### Step 0.3 — Scaffold Next.js app

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

Confirm it runs:

```bash
npm run dev
```

---

## Phase 1 — Public Landing Page (Hero, Event Details, Registration)

**Goal of this phase:** a live, deployable single-page site announcing the tournament, with a hero section, key details (date, time, venue, format), and a registration CTA linking to a Google Form. No database or backend needed yet — this can ship today.

### Step 1.1 — Define the event details as a single config file

Create `apps/web/config/tournament.ts`:

```ts
export const tournamentConfig = {
  name: "Soft Ball Championship 2026",
  tagline: "Your city's biggest soft-ball cricket tournament",
  date: "2026-09-05",
  time: "8:00 AM onwards",
  venue: "Ground Name, City",
  venueMapUrl: "https://maps.google.com/?q=...",
  registrationFormUrl: "https://forms.google.com/...",
  registrationDeadline: "2026-09-10",

  // Leave these open until registration closes — don't guess a number
  format: "League + Knockout · overs & balls-per-over TBD",
  maxTeams: null,          // set once organizers confirm a cap, or leave null (open registration)
  teamsRegistered: null,   // wire to a live count once Phase 2 DB exists; null = "Registration open"

  entryFee: "LKR 5,000 per team",
  contactEmail: "your-email@example.com",
  contactPhone: "+94 7XX XXX XXX",
  socials: { facebook: "...", instagram: "..." }
};
```

This is the single source of truth for every detail on the page — edit this file, never hunt through components to change a date or the form link.

### Step 1.2 — Build the Hero section

Create `apps/web/components/Hero.tsx`. Requirements:
- Full-viewport-height section, tournament name as the dominant headline, tagline beneath.
- Background: solid color/gradient or a cricket-themed image (agent should use `frontend-design` skill guidance for styling choices — distinctive, not a generic template look).
- Primary CTA button: "Register Now" → links to `tournamentConfig.registrationFormUrl`, opens in a new tab.
- Secondary CTA: "View Details" → smooth-scrolls to the Event Details section.
- Countdown-to-tournament-date is a nice optional touch, not required.

### Step 1.3 — Build the Event Details section

Create `apps/web/components/EventDetails.tsx`. Display, pulled from `tournamentConfig`:

```
📅 Date        [date]
⏰ Time        [time]
📍 Venue       [venue] — with a link to venueMapUrl
🏏 Format      [format]
💰 Entry Fee   [entryFee]
⏳ Registration closes [registrationDeadline]
```

Lay these out as a card grid (4–6 cards), not a plain list — this is the section people screenshot and share, so it should look complete on its own.

### Step 1.4 — Build the Registration section

Create `apps/web/components/Registration.tsx`.

- Short paragraph: what teams need to prepare before registering (squad list, contact person, etc. — placeholder copy is fine, editable later).
- Prominent button linking to `tournamentConfig.registrationFormUrl`.
- Optionally embed the Google Form directly via iframe instead of just linking out:

```tsx
<iframe
  src={tournamentConfig.registrationFormUrl.replace('/viewform', '/viewform?embedded=true')}
  width="100%"
  height="800"
  frameBorder="0"
>
  Loading…
</iframe>
```

Decide embed vs. external-link based on whether you want people to leave the site — embedding keeps them on-page, linking out is simpler and avoids iframe sizing issues on mobile. Default to a button link for v1; embedding can be added later without restructuring anything.

### Step 1.5 — Additional sections (optional but recommended)

- **Teams section** — even before live scoring exists, a static "Confirmed Teams" grid (logos once available) builds credibility. Can start as a hardcoded array, later pulled from the database once Phase 2 exists.
- **Contact/Footer** — `contactEmail`, `contactPhone`, socials, all from `tournamentConfig`.
- **FAQ** — common questions (squad size, rules summary, format) as an accordion.

### Step 1.6 — Assemble the page

`apps/web/app/page.tsx`:

```tsx
import Hero from '@/components/Hero';
import EventDetails from '@/components/EventDetails';
import Registration from '@/components/Registration';
// import Teams, FAQ, Footer as built

export default function Home() {
  return (
    <main>
      <Hero />
      <EventDetails />
      <Registration />
      {/* <Teams /> <FAQ /> <Footer /> */}
    </main>
  );
}
```

### Step 1.7 — Deploy immediately

```bash
cd apps/web
npx vercel
```

At this point you have a live, shareable tournament page with working registration — before any of the scoring platform exists. This is the deliverable to promote while the rest of the system gets built.

### Step 1.8 — Verify checklist before moving on

```
[ ] Hero renders correctly on mobile (this is what most visitors will use)
[ ] Registration button/embed actually opens the correct Google Form
[ ] All tournamentConfig fields display correctly (no "undefined" on page)
[ ] Venue map link opens Google Maps correctly
[ ] Site is deployed and the URL works from a phone on mobile data (not just localhost)
```

---

## Phase 2 — Database & Core Entities

**Goal:** stand up Postgres via Supabase, define the schema for teams/players/tournaments/stages, and connect the admin side so you can start entering real team data — still no live scoring yet.

### Step 2.1 — Create Supabase project

Create project at supabase.com. Note down (for `.env`):
```
DATABASE_URL        (pooled connection, for app)
DIRECT_URL          (direct connection, for Prisma migrations)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Step 2.2 — Set up Prisma

```bash
cd packages/database
npm init -y
npm install prisma @prisma/client
npx prisma init
```

### Step 2.3 — Define schema — Phase 2a (identity entities only)

In `packages/database/prisma/schema.prisma`, define first:
```
users
teams
players
team_players
tournaments
tournament_stages
tournament_teams
tournament_squads
venues
```

Use the field lists from `cricket-platform-full-summary.md` §7 exactly — don't redesign them, they were already worked through. Run:

```bash
npx prisma migrate dev --name init_identity_entities
```

### Step 2.4 — Seed script

Create `packages/database/prisma/seed.ts` with a few sample teams/players so the admin UI has something to render immediately. Wire it into `package.json`:

```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

```bash
npx prisma db seed
```

### Step 2.5 — Connect Next.js to the database

Install Prisma client in `apps/web`, point it at the same `DATABASE_URL`. At this stage, Next.js can talk to Postgres directly via Server Actions/Route Handlers for simple admin CRUD (teams, players, tournament setup) — you don't need the full Express API running yet for basic data entry. The dedicated Express backend becomes necessary starting Phase 3 (scoring engine + Socket.IO).

### Step 2.6 — Minimal admin pages

Build just enough to be useful:
```
/admin/teams          → list + create team (name, logo upload to Supabase Storage)
/admin/players         → list + create player, assign to team
/admin/tournaments      → create tournament, add stages with overs/ballsPerOver
```

Keep these plain and functional — polish comes later. The goal of this phase is: organizer can log in and set up the tournament skeleton for real.

### Step 2.7 — Image upload wiring

Set up Supabase Storage buckets: `team-logos`, `player-images`. Wire the team/player create forms to upload to the correct bucket and store only the resulting URL in Postgres (never store image bytes in the database — see summary §7).

### Step 2.8 — Update the public site to pull real data

Go back to the Teams section from Step 1.5 — replace the hardcoded array with a real query against `tournament_teams`/`teams`, so the public page now reflects actual registered teams.

---

## Phase 3 — Match Engine (Express + Cricket Engine)

**Goal:** stand up the Express backend, the `cricket-engine` package, and full match/innings/delivery scoring — this is where the addendum's free-hit, consecutive-over, batting-order, retired-hurt, locking, and single-scorer logic all get built, since they're core to the match engine, not separate add-ons.

### Step 3.1 — Scaffold Express

```bash
cd apps/api
npm init -y
npm install express socket.io zod argon2 jsonwebtoken
npm install -D typescript ts-node @types/express @types/node
npx tsc --init
```

### Step 3.2 — Auth

Implement JWT + refresh token auth, Argon2id password hashing, roles (`SUPER_ADMIN, TOURNAMENT_ADMIN, SCORER, VIEWER`) per summary §23.

### Step 3.3 — Extend schema — Phase 3a (match entities)

Add to `schema.prisma`:
```
matches (+ activeScorerId, scorerSessionToken, scorerLockedAt)
match_players (+ battingOrder)
substitutions
innings (+ lastOverBowlerId, version)
deliveries (+ isFreeHit)
fall_of_wickets
innings_batting_stats (+ retiredHurt, canReturn, returnedAt)
innings_bowling_stats
audit_logs
```

```bash
npx prisma migrate dev --name match_engine_entities
```

### Step 3.4 — Build `packages/cricket-engine`

Implement, in order (each is independently testable):
```
calculateOvers()
calculateStrike()
calculateRunRate()
calculateDelivery()          — core: given current state + a delivery input, return new state
validateBowlerSelection()     — max-balls + consecutive-over checks combined
validateFreeHitDismissal()
assignBattingOrder()
handleRetiredHurtReturn()
calculateDismissal()
calculateBattingFigures()
calculateBowlerFigures()
calculateInningsState()
calculateTarget()
determineWinner()
```

Write unit tests for each as you build it — use the full checklist from summary §30, including the variable-balls-per-over cases and the free-hit/retired-hurt cases specifically.

### Step 3.5 — Scoring endpoint

Build `POST /api/innings/:inningsId/deliveries` following the exact validation order in summary §19. Wrap the write in a Prisma transaction with the `innings.version` optimistic-lock check (§15).

### Step 3.6 — Single-scorer lock middleware

Implement the claim/heartbeat/release flow from summary §16 as Express middleware in front of all scoring-write routes.

### Step 3.7 — Match/innings lifecycle endpoints

```
POST /api/matches/:id/toss
POST /api/matches/:id/start
POST /api/matches/:id/innings          (start an innings)
POST /api/matches/:id/finalize          (result calc, stats, standings update, lock)
POST /api/innings/:id/deliveries/:deliveryId/correct    (undo/edit, writes audit_log)
```

### Step 3.8 — Scorer UI

Build the `/admin/matches/[id]/score` screen per summary §28 — the one-handed fast-tap interface, free-hit badge, filtered wicket/next-batter selection.

### Step 3.9 — Test end-to-end with a real dummy match

Score a full mock match manually through the UI — both innings, at least one wicket of each type, a wide, a no-ball followed by a free hit, one bowler restriction violation (should be rejected), one undo. Confirm the database state is correct at every step.

---

## Phase 4 — Real-Time, Public Scorecards, Tournament Engine

**Goal:** Socket.IO live broadcast, public live-score pages, points/NRR/standings, and the read-scaling work from the addendum.

### Step 4.1 — Socket.IO wiring

Room-per-match (`match:<id>`), broadcast full state object after every committed delivery — per summary §21. Never broadcast before the DB transaction commits.

### Step 4.2 — In-memory live-state cache

Implement the `currentState[matchId]` cache and the `GET /api/matches/:id/live-state` endpoint that serves from it, per summary §21.

### Step 4.3 — Public match page

`apps/web/app/matches/[id]/page.tsx` — live score, scorecard, ball-by-ball, fall of wickets, batting/bowling tables. Connects to the Socket.IO room on mount, calls `/live-state` only on initial load and on reconnect (never polling).

### Step 4.4 — Tournament engine

Build `calculateStandings()`, `calculateNRR()` fully, the points table page, and the qualification logic (tie-breaker chain, configurable per stage) per summary §17.

### Step 4.5 — HTTP caching for completed matches

Add `Cache-Control` headers keyed on `matches.updatedAt`/version for completed-match scorecard endpoints, per summary §21.

### Step 4.6 — Rate limiting

Add tiered rate-limit middleware — loose on public read endpoints, tight on the scoring write endpoint, per summary §21.

### Step 4.7 — Production deployment

Move backend to an **always-on paid Render instance** (not free tier — see summary §3), confirm Supabase is on a plan with backups, re-verify env vars, and do a full live-match rehearsal before tournament day.

---

## What to Hand the AI Agent, Concretely

If running this with an agentic coding tool (Claude Code, etc.), the cleanest execution pattern is:

1. Paste **Phase 0 + Phase 1** as the first task — "scaffold this monorepo and build the landing page exactly as specified." This alone produces a deployable result you can react to before committing further.
2. Review the deployed landing page, adjust `tournamentConfig.ts` values and styling.
3. Hand **Phase 2** as the next task once real team/player data is ready to be entered.
4. Hand **Phase 3** only once the organizer questionnaire (summary §32) has real answers — the scoring engine's validation rules depend on those answers (which dismissals are allowed, bowler limits, etc.), so building it before they're confirmed risks rework.
5. Hand **Phase 4** last, once at least one full match has been manually tested end-to-end in Phase 3.

Keep each phase as a separate task/commit rather than asking for the whole platform in one shot — it's easier to verify correctness (especially the cricket-rule edge cases) in smaller reviewable chunks, and you get a working, demoable product at the end of Phase 1 rather than nothing until everything is done.
