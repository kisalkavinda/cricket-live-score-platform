# 🏏 Computing Premier League (CPL)

### Next-Gen Real-Time Cricket Scoring & Tournament Management Platform

[![Live Application](https://img.shields.io/badge/Live%20Platform-computing--premier--league.vercel.app-00df89?style=for-the-badge&logo=vercel&logoColor=white)](https://computing-premier-league.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind_css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma%20ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌐 Live Production Platform

> **Official Deployment:** [https://computing-premier-league.vercel.app/](https://computing-premier-league.vercel.app/)  
> **Official Venue:** Ratmalana CGR Ground (Ratmalana United S.C), Sri Lanka  
> **Host Organization:** Faculty of Computing

---

## 📌 Executive Overview

**Computing Premier League (CPL)** is a modern, full-stack, real-time tournament management and ball-by-ball live scoring platform architected specifically for collegiate and professional cricket tournaments.

Engineered to solve the unpredictability of live pitch-side match operations, the platform integrates **offline-first scoring resilience**, **real-time WebSocket broadcasting**, an **interactive digital chit-draw ceremony**, an **ICC-standard mathematical Net Run Rate (NRR) calculation engine**, a dedicated **stadium jumbotron display screen**, and a **stealth administrative console** protected by cryptographic session controls.

---

## ✨ Key Platform Features

### 1. ⚡ Mobile-First Live Scoring Console (`/[secretPath]/matches/[id]/score`)
- **One-Handed Pitch-Side UI:** Ergonomically designed for rapid touch scoring under bright sunlight and high-pressure tournament conditions.
- **Comprehensive Ball Event Support:** Single-tap recording for `0, 1, 2, 3, 4, 6` runs, along with Extras (`Wide`, `No-Ball`, `Bye`, `Leg-Bye`).
- **Dismissal Modal with Smart Fielder Attribution:** Dynamic capture of `BOWLED`, `CAUGHT`, `LBW`, `RUN_OUT`, `STUMPED`, `HIT_WICKET`, and `RETIRED_HURT`, auto-filtering eligible fielders and bowlers.
- **Wide Ball Dismissals & Shortcut:** Direct support for dismissals occurring on wide balls (stumped, run out, hit wicket) and quick-action shortcuts.
- **Bowling Restriction Enforcement:** Real-time validation preventing consecutive overs by the same bowler and strictly enforcing tournament per-bowler over limits.
- **Non-Destructive Corrections:** Multi-level Undo and individual ball edit capabilities that transactionally recompute all batting, bowling, partnerships, and match statistics.

### 2. 📶 Offline-First Resilience & Sync Engine (`lib/offline/`)
- **Pitch-Side Zero-Drop Guarantee:** In the event of unstable field network connectivity, deliveries are buffered instantly into browser **IndexedDB** storage.
- **Optimistic State Projection:** Scorer UI updates with zero latency; batsmen scores, bowler figures, and strike rotation update instantaneously.
- **Background Synchronization Engine:** As soon as connectivity is restored, queued ball events sync sequentially to PostgreSQL with transactional conflict resolution and optimistic version checking (`innings.version`).

### 3. 📺 Stadium Big Screen / Jumbo Display (`/display`)
- **Broadcast & Jumbotron Mode:** High-contrast, clean stadium display format designed for ground LED boards, large screens, and live stream camera overlays.
- **Instantaneous Real-Time Updates:** Live score, active batsman striker/non-striker strike rates, bowler figures, required run rate (RRR), current run rate (CRR), and target update automatically with sub-second latency.

### 4. 🎲 Digital Chit-Picking Draw Ceremony (`/tournament/draw`)
- **Live Interactive Team Seeding:** Replaces traditional paper lotteries with an animated digital ceremony where team captains pick randomized digital chits.
- **Real-Time Stage Projection:** Group assignments (Group A vs Group B) sync across devices in real time with captain turn order tracking and complete audit logs.

### 5. 🏆 Tournament Engine & Automated Bracket System (`/tournament`)
- **Flexible Championship Formats:** Authoritative format engine supporting:
  - **8-Team Championship:** 16 matches (12 group matches, 3-match playoffs, Grand Final) with global playoff seeding.
  - **6-Team & 7-Team Championships:** Round-robin group stages with wildcard fixtures and knockout playoffs.
- **Interactive Visual Bracket Tree:** Dynamic bracket visualization mapping progression from group stages through playoffs to the Championship Final.
- **Top Performers Leaderboards:** Automated calculation of Orange Cap (Most Runs), Purple Cap (Most Wickets), highest individual scores, and best bowling figures.

### 6. 📊 Mathematical & ICC-Compliant Net Run Rate (NRR) Engine (`lib/tournament/nrr-engine.ts`)
- **Variable Balls-Per-Over Support:** Accurately computes effective overs as `effectiveOvers = legalBalls / ballsPerOver` (e.g. 4-ball, 5-ball, or 6-ball overs without decimal inaccuracies).
- **All-Out Rule Enforcement:** Teams dismissed all-out are assigned their full allotted innings overs for defensive and offensive NRR computations.
- **Multi-Way Tie-Breaker Resolution:** Comprehensive resolution algorithm: `Points` → `Net Run Rate (NRR)` → `Head-to-Head Mini-League` → `Total Wins`.

### 7. 🛡️ Stealth Admin Control Suite (`/[secretPath]`)
- **Obfuscated Administration URL:** Hardened routing where direct requests to `/admin` are intercepted by middleware and returned as `404 Not Found`.
- **Brute-Force Protection & Cryptographic Sessions:** IP rate limiting, account lockouts after consecutive failed attempts, and secure HTTP-only cookies with HMAC authentication.
- **Complete Operations Hub:** Full control over Tournaments, Stages, Teams, Players, Rosters, Match Toss & Status, Exception Approvals, and Award presentations.

### 8. 📋 Team Registration Portal & Google Sheets Dual-Sync (`/register`)
- **Roster & Captain Verification:** Student index number validation, photo upload integration, and captain emergency contact capture.
- **Dual-Data Persistence:** Submissions save directly to PostgreSQL with an automated secondary asynchronous sync to **Google Sheets API** for committee backup.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Presentation"]
        Fan["📱 Fans & Spectators\n(Public Next.js Portal)"]
        Display["📺 Stadium Jumbo Screen\n(/display LED View)"]
        Scorer["🏏 Pitch Scorer Device\n(/matches/[id]/score)"]
        Admin["🛡️ Tournament Admin\n(/[secretPath] Console)"]
    end

    subgraph OfflineSync["Pitch Offline Layer"]
        IDB[("IndexedDB Local Queue")]
        SyncEngine["Sync Engine & Projection"]
    end

    subgraph AppLayer["Next.js 16 Application Layer"]
        Middleware["Security Middleware\n(/admin -> 404 Honeywall)"]
        ServerActions["Server Actions &\nMutation Handlers"]
        API["REST & Cache Endpoints\n(/api/matches, /api/registrations)"]
        NRREngine["NRR & Standings Engine"]
        ScoringRules["Cricket Rules & Bowler Restrictions"]
    end

    subgraph DataLayer["Supabase & External Services"]
        Postgres[("PostgreSQL\n(Prisma ORM 5)")]
        RealtimeBroadcast["Supabase Realtime\n(WebSocket Channel Broadcasts)"]
        StorageBucket[("Supabase Storage\n(Team Logos & Player Photos)")]
        GoogleSheets[("Google Sheets API\n(Registration Backup Sync)")]
    end

    Scorer -->|Touch Input| IDB
    IDB --> SyncEngine
    SyncEngine -->|Transactional POST / Action| ServerActions

    Admin -->|Authenticated Sessions| ServerActions
    Fan -->|Read-only Browse| API
    Display -->|Live Score Subscription| RealtimeBroadcast

    ServerActions --> ScoringRules
    ServerActions --> NRREngine
    ScoringRules --> Postgres
    NRREngine --> Postgres

    Postgres -.->|Commit Event| RealtimeBroadcast
    RealtimeBroadcast -->|Real-time Socket Update| Display
    RealtimeBroadcast -->|Real-time Socket Update| Fan

    ServerActions -->|Team Logo / Photo| StorageBucket
    ServerActions -->|Dual-Sync Stream| GoogleSheets
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** | High-performance React server and client components |
| **UI Library** | **React 19** | Dynamic component state and optimistic UI hooks |
| **Language** | **TypeScript 5** | Strict end-to-end type safety across client and server |
| **Styling** | **Tailwind CSS v4** | Rapid, responsive, modern dark-mode tournament aesthetics |
| **Icons & Motion** | **Lucide React & DotLottie** | Crisp vector iconography and smooth animation cues |
| **Database & ORM** | **PostgreSQL & Prisma ORM 5** | Relational data integrity, migrations, and schema validation |
| **Database Host** | **Supabase** | Managed PostgreSQL with connection pooling (`pgbouncer`) |
| **Asset Storage** | **Supabase Storage** | High-speed CDN delivery of team logos and player avatars |
| **Live Updates** | **Supabase Realtime** | Low-latency match delivery events over WebSockets |
| **Form Handling** | **React Hook Form & Zod** | Robust client and server data validation schemas |
| **External Integrations** | **Google APIs (`googleapis`)** | Dual-backup registration pipeline to Google Sheets |
| **Hosting & CI/CD** | **Vercel** | Edge network deployment, analytics, and instant deployments |

---

## 📁 Repository & Monorepo Structure

```
cricket-platform/
├── apps/
│   └── web/                                  # Primary Next.js 16 Application
│       ├── app/
│       │   ├── page.tsx                      # Public Landing Page & Live HUD
│       │   ├── tournament/                   # Tournament Hub, Standings & Bracket
│       │   │   ├── page.tsx                  # Groups, Fixtures, Leaderboards
│       │   │   └── draw/page.tsx             # Interactive Digital Chit Draw Ceremony
│       │   ├── scorecard/page.tsx            # Full Ball-by-Ball Scorecard
│       │   ├── display/page.tsx              # Stadium Jumbo Screen Display Mode
│       │   ├── register/                     # Registration Portal, Success & Closed States
│       │   ├── rules/page.tsx                # Official CPL Tournament Match Rules
│       │   ├── [secretPath]/                 # Stealth Admin Route (Configurable via ENV)
│       │   │   └── (admin)/
│       │   │       ├── dashboard/            # Admin Overview & Quick Actions
│       │   │       ├── matches/              # Match Scheduling & List
│       │   │       │   └── [id]/score/       # Real-Time Scorer Console
│       │   │       ├── teams/                # Team Creation, Logos & Squad Lists
│       │   │       ├── players/              # Player Directory & Profiles
│       │   │       ├── registrations/        # Entry Approvals & Exceptions
│       │   │       └── tournament-draw/      # Admin Chit Draw Management
│       │   └── api/                          # Next.js API Route Handlers
│       ├── components/                       # Shared UI Components (Hero, Bracket, Tables, etc.)
│       ├── config/                           # Tournament Metadata & Rule Configs
│       ├── lib/
│       │   ├── scoring/                      # Scoring rules, actions, service & cache
│       │   ├── offline/                      # IndexedDB, projection, sync engine & hooks
│       │   ├── tournament/                   # Format configs, NRR engine & bracket logic
│       │   ├── auth/                         # Admin session security & rate limiting
│       │   └── validations/                  # Zod validation schemas
│       ├── middleware.ts                     # Honeypot route interception (/admin -> 404)
│       └── next.config.ts                    # Next.js optimization configuration
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   └── schema.prisma                 # Authoritative PostgreSQL Database Schema
│   │   └── index.ts                          # Singleton Prisma Client Export
│   ├── cricket-engine/                       # Reusable scoring calculations
│   ├── shared-types/                         # Monorepo TypeScript interfaces
│   └── validation/                           # Shared validation rules
├── docs/                                     # System blueprints and architectural guides
├── .env.example                              # Environment configuration template
├── package.json                              # Root monorepo workspace configuration
└── README.md                                 # Project Documentation
```

---

## 📜 CPL Official Tournament Rules Summary

The platform strictly embeds and automates the official rules of the Computing Premier League:

| Rule | Specification | Platform Implementation |
|---|---|---|
| **Bowling Limit** | Max **1 over per bowler** per match | Bowler selection dropdown validates and locks ineligible bowlers |
| **No Ball Rule** | Any ball above chest height is a No Ball | Recorded as **+1 Run** + extra legal delivery; **No Free Hit** awarded |
| **Chucking** | Illegal bowling actions strictly barred | Called as a No Ball by match umpires |
| **Wide Ball** | Delivery outside batsman's reasonable reach | Recorded as **+1 Run** + extra delivery; dismissals off wide supported |
| **Boundary Restrictions** | Max 3 fielders on leg side, max 2 on off side | Embedded in umpire rules reference |
| **Points System** | **Win = 2 pts**, **Tie = 1 pt**, **Loss = 0 pts** | Automated points table update on match finalization |
| **Tie-Breakers** | 1. Points → 2. Net Run Rate (NRR) → 3. H2H | Automated NRR engine with all-out innings over adjustments |
| **Format** | 8-Team 16-Match Format | 2 groups of 4, round-robin, global seeding into playoffs and grand final |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** 20.x or higher
- **npm** 10.x or higher
- A **Supabase** project (or local PostgreSQL instance)

### 1. Clone the Repository
```bash
git clone https://github.com/kisalkavinda/cricket-live-score-platform.git
cd cricket-live-score-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
# Supabase PostgreSQL Connections
DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&connect_timeout=15"
DIRECT_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Public API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# Google Sheets Secondary Backup (Server-Side Only)
GOOGLE_SHEETS_SPREADSHEET_ID=""
GOOGLE_SHEETS_CLIENT_EMAIL=""
GOOGLE_SHEETS_PRIVATE_KEY=""

# Admin Authentication (Stealth Access)
ADMIN_ENTRY_PATH="your-custom-admin-secret-path"
ADMIN_PASSWORD="your-strong-password"
ADMIN_SESSION_SECRET="your-cryptographic-secret-string"
```

### 4. Setup Prisma ORM & Database Schema
Generate the Prisma Client and push the schema to your database:
```bash
# Generate Prisma Client
npx prisma generate --schema=packages/database/prisma/schema.prisma

# Push schema directly to database (development)
npx prisma db push --schema=packages/database/prisma/schema.prisma
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

The platform includes comprehensive test coverage for tournament scheduling, NRR calculations, and edge-case simulation:

```bash
# Run tournament simulation test suite
npm run test --workspace=web

# Run TypeScript compilation check
npx tsc --noEmit --project apps/web/tsconfig.json
```

---

## 🚢 Production Deployment

The web application is optimized for deployment on **Vercel**:

1. Connect the repository to your Vercel project.
2. Ensure Root Directory is left as default (or point to the workspace).
3. Set the Build Command:
   ```bash
   prisma generate --schema=../../packages/database/prisma/schema.prisma && next build
   ```
4. Configure all environment variables from `.env.example` in the Vercel Project Dashboard.
5. Deploy to Production.

---

## 👨‍💻 Project Lead & Maintainer

**Kisal Kavinda**  
- GitHub: [@kisalkavinda](https://github.com/kisalkavinda)  
- Email: [kisalkavinda1@gmail.com](mailto:kisalkavinda1@gmail.com)  
- Project Repository: [kisalkavinda/cricket-live-score-platform](https://github.com/kisalkavinda/cricket-live-score-platform)

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use and adapt this system for your own cricket tournaments.
