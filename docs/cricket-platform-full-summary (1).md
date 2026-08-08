# Cricket Tournament Platform — Full Consolidated Summary

Everything from the original blueprint + the addendum, in one place. Organized so you can use this as the actual build reference.

---

## 1. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Public/Admin frontend | Next.js + TypeScript | Same app serves both public site and `/admin` |
| UI | Tailwind CSS | |
| Backend | Node.js + Express + TypeScript | REST API + scoring engine |
| ORM | Prisma ORM | Migrations + DB access |
| Database | PostgreSQL | Via Supabase |
| Real-time | Socket.IO | Room-based, one room per match |
| Image storage | Supabase Storage | Two buckets: `team-logos`, `player-images` |
| Auth | Backend JWT + refresh tokens | Argon2id for password hashing |
| Validation | Zod | API/input validation |
| Testing | Vitest + Supertest + Playwright | Unit / API / E2E |
| Frontend hosting | Vercel | |
| Backend hosting | Render | Free tier for dev only — see §3 |
| Source control | GitHub | Monorepo structure, §11 |
| Local dev | Docker/PostgreSQL optional | |

**Why PostgreSQL over MongoDB:** the data is heavily relational (Tournament→Stage→Match→Innings→Delivery, Team→Player→Squad→PlayingXI, Match→Points→Standings→Qualification). You need foreign keys, transactions, constraints, joins, and aggregation. No advantage from MongoDB justifies giving that up.

---

## 2. Hosting Architecture

```
GitHub → Vercel (Next.js)  +  Render (Express + Socket.IO) → Supabase (PostgreSQL + Storage)
```

- Frontend: Vercel, e.g. `https://your-tournament.com`
- Backend: Render, e.g. `https://api.your-tournament.com`
- Database + file storage: Supabase

## 3. Free Tier vs Production — Critical Distinction

**Do not run a live tournament on Render's free backend.** Render's free web service spins down after 15 minutes with no inbound traffic (including WebSocket traffic) and takes ~1 minute to wake — unacceptable for live scoring. Render's free Postgres also expires after 30 days with no backups.

Supabase's free plan (500 MB DB, 1 GB storage, 200 peak concurrent realtime connections) is fine for dev but has no automatic backups and can pause after a week of inactivity.

**Target setup:**

| | Development | Tournament Production |
|---|---|---|
| Frontend | Vercel Free | Vercel |
| Backend | Render Free | Render **always-on paid** |
| Database | Supabase Free | Supabase with backups/production plan |

---

## 4. Environment Variables

**Frontend:**
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SOCKET_URL
```

**Backend:**
```
DATABASE_URL          (pooled, for app traffic)
DIRECT_URL            (direct, for migrations/CLI)
JWT_SECRET
JWT_REFRESH_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   (never exposed to browser)
FRONTEND_URL
NODE_ENV
```

## 5. GitHub / Monorepo Structure

```
cricket-platform/
├── apps/
│   ├── web/          → Next.js
│   └── api/           → Express
├── packages/
│   ├── database/      → Prisma
│   ├── cricket-engine/ → scoring rules (see §14)
│   ├── shared-types/
│   └── validation/
├── package.json
└── README.md
```

---

## 6. Three-Level Rules Hierarchy

Rules cascade: **Tournament → Stage → Match**. When a match is created, its `oversPerInnings` and `ballsPerOver` are **copied** from the stage at that moment — so if the organizer later edits stage rules, already-completed matches stay historically correct. Never hard-code balls-per-over as 6; always use `match.ballsPerOver`.

```
maxBalls = oversPerInnings * ballsPerOver
```

Store `legalBalls` (e.g. 52) as the real value, not the display string ("8.4"). Display format is derived, not stored.

---

## 7. Full Database Entity List

```
users
teams
players
team_players

tournaments
tournament_stages
tournament_teams
tournament_squads

matches
match_players
substitutions

innings
deliveries
fall_of_wickets

innings_batting_stats
innings_bowling_stats

match_awards
tournament_player_stats
tournament_awards

audit_logs
match_events

venues (supporting)
notifications (supporting)
refresh_tokens (supporting)
tournament_fixtures (supporting)
```

### Key relationship chain (identity → participation)

```
players                    → who someone is
team_players                → belongs to a team (seasonal, not permanent)
tournament_squads           → registered for a tournament
match_players                → selected for a specific match / Playing XI
substitutions                → mid-match player swap
deliveries                   → the actual cricket event (source of truth)
innings + derived stats      → current score
tournament_teams (completed matches only) → ranking
tournament_awards            → final honors
audit_logs                   → every modification, always
```

### Fields worth calling out per table

- **users** — roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `SCORER`, `VIEWER`. A scorer can only score matches assigned to them (enforced further by the single-scorer lock in §16).
- **teams** — `id, name, shortName, logoUrl, city, createdAt, updatedAt`
- **players** — `id, name, profileImageUrl, dateOfBirth, role, battingStyle, bowlingStyle, jerseyNumber`. Roles: `BATTER, BOWLER, ALL_ROUNDER, WICKET_KEEPER`. Images stored in Supabase Storage, only the URL lives in Postgres.
- **tournaments** — `id, name, season, format, status, startDate, endDate`. Status: `UPCOMING, LIVE, COMPLETED, CANCELLED`. Does **not** hold `oversPerInnings` — that's stage-level.
- **tournament_stages** — `id, tournamentId, name, stageOrder, oversPerInnings, ballsPerOver, pointsForWin, pointsForTie, pointsForNoResult, pointsForLoss, qualificationCount`
- **tournament_teams** — `tournamentId, teamId, matchesPlayed, wins, losses, ties, noResults, points, runsFor, legalBallsFaced, runsAgainst, legalBallsBowled` (raw values, NRR is calculated, not stored)
- **matches** — `id, tournamentId, stageId, team1Id, team2Id, venueId, matchDate, matchNumber, stage, oversPerInnings, ballsPerOver, status, tossWinnerTeamId, tossDecision, winnerTeamId, resultDescription`
  - **+ addendum:** `activeScorerId, scorerSessionToken, scorerLockedAt` (§16)
- **match_players** — `matchId, teamId, playerId, isPlayingXI, isSubstitute, isCaptain, isWicketKeeper`
  - **+ addendum:** `battingOrder` (nullable, written live — §13)
- **substitutions** — `matchId, teamId, playerOutId, playerInId, reason, overNumber, createdAt`. Reasons: `INJURY, TACTICAL, OTHER`.
- **innings** — `id, matchId, inningsNumber, battingTeamId, bowlingTeamId, oversLimit, ballsPerOver, legalBalls, runs, wickets, targetRuns, status, currentStrikerId, currentNonStrikerId, currentBowlerId`. Status: `NOT_STARTED, LIVE, COMPLETED, ABANDONED`.
  - **+ addendum:** `lastOverBowlerId` (§12), `version` (§15)
- **deliveries** (most important table) — `id, inningsId, deliveryNumber, overNumber, ballInOver, strikerId, nonStrikerId, bowlerId, batsmanRuns, extrasRuns, totalRuns, extraType, isLegalBall, wicket, wicketType, dismissedPlayerId, fielderId, commentary, createdAt`
  - **+ addendum:** `isFreeHit` (§11)
- **fall_of_wickets** — `inningsId, wicketNumber, playerId, score, overNumber`
- **innings_batting_stats** — `playerId, inningsId, runs, balls, fours, sixes, isOut, dismissalType, dismissalText`
  - **+ addendum:** `retiredHurt, canReturn, returnedAt` (§13)
- **innings_bowling_stats** — `playerId, inningsId, legalBalls, runsConceded, wickets, maidens, wides, noBalls`
- **match_awards** — `PLAYER_OF_MATCH, BEST_BATTER, BEST_BOWLER, BEST_FIELDER, BEST_ALL_ROUNDER` (configurable which exist)
- **tournament_player_stats** — matches, innings, runs, ballsFaced, fours, sixes, highestScore, fifties, hundreds, wickets, ballsBowled, runsConceded, maidens, bestBowlingWickets, bestBowlingRuns, (optionally catches/runOuts/stumpings)
- **tournament_awards** — `PLAYER_OF_TOURNAMENT, BEST_BATTER, BEST_BOWLER, BEST_ALL_ROUNDER, BEST_WICKETKEEPER, BEST_FIELDER, EMERGING_PLAYER`. System calculates stats and recommends candidates; organizer makes the final call — not a pure formula.
- **audit_logs** — `userId, matchId, action, entity, entityId, oldValue, newValue, timestamp`

---

## 8. Extras, Dismissals, Bowler Attribution

**Extras (support at least):** `WIDE, NO_BALL, BYE, LEG_BYE, PENALTY` — exact rules confirmed by organizers, don't assume standard pro-cricket rules apply to soft-ball.

**Dismissals (support at least):** `BOWLED, CAUGHT, CAUGHT_AND_BOWLED, LBW, RUN_OUT, STUMPED, HIT_WICKET, RETIRED_HURT, RETIRED_OUT, TIMED_OUT, OBSTRUCTING_THE_FIELD`

**Bowler wicket attribution** (encode in engine, don't rely on scorer to calculate manually):
- Counts as bowler's wicket: Bowled, Caught, Caught & Bowled, LBW, Stumped
- Does NOT count as bowler's wicket: Run Out, Retired Out

**Retired Hurt vs Retired Out** (kept as distinct dismissal types, not one option with a toggle — the downstream logic differs):
- `RETIRED_HURT`: not out, `canReturn` flag (organizer-configurable, default true), can resume batting later at the same `innings_batting_stats` row (stats continue accumulating, no duplicate row), tracked via `returnedAt`.
- `RETIRED_OUT`: final, `isOut = true`, `canReturn = false`, no re-selection possible.

---

## 9. Free Hit (addendum)

- Triggered automatically: if the previous legal delivery in the over was a `NO_BALL`, the next delivery gets `isFreeHit = true`.
- A wide does **not** clear free-hit status — only a legal delivery does. *(Flagged earlier as an assumption — confirm against your organizers' actual rule, some local variants differ.)*
- On a free-hit delivery, only `RUN_OUT` (or other organizer-approved exceptions) is a valid dismissal — engine rejects everything else, and the UI should gray out invalid options before the scorer even taps, not just rely on a server-side rejection.

## 10. Bowling Restrictions (original + addendum)

- Configurable `maxBallsPerBowler` per stage (not just "max overs," since balls-per-over varies) — e.g. max 2 overs × 8 balls/over = 16 legal balls max.
- **Consecutive-over restriction (addendum):** a bowler can't bowl two overs in a row. Tracked via `innings.lastOverBowlerId`, updated at end-of-over. Both this check and the max-balls check should live in one combined `validateBowlerSelection()` function in the cricket-engine package, since they both fire at the same point (start of over).

## 11. Free Hit — schema field
`deliveries.isFreeHit` (boolean, default false) — see §9.

## 12. Consecutive-Over Restriction — schema field
`innings.lastOverBowlerId` (nullable) — see §10.

## 13. Batting Order & Retired-Hurt Return (addendum, decided: scorer picks live)

- **No pre-declared batting order.** When a wicket falls, the scorer selects the next batter live from the remaining Playing XI.
- `match_players.battingOrder` (nullable integer) is written the moment a player is actually confirmed as striker/non-striker for the first time — it's a record of what happened, not a plan. Sequential integer per innings.
- Scorer's selection list at each wicket is filtered: only players not yet dismissed, in `match_players` with `isPlayingXI = true` or an approved substitute; retired-hurt players eligible to return show with a distinct "returning" label.
- Fall-of-wickets display naturally reflects true batting order since it just reads `battingOrder` — no extra logic needed there.
- Retired-hurt return logic detailed in §8 above; schema fields `retiredHurt, canReturn, returnedAt` on `innings_batting_stats`.

## 14. Cricket Engine (dedicated package)

`packages/cricket-engine/` — the frontend never implements cricket rules; everything routes through here:

```
calculateDelivery()
calculateStrike()
calculateOvers()
calculateRunRate()
calculateBowlerFigures()
calculateBattingFigures()
calculateDismissal()
calculateInningsState()
calculateTarget()
calculateNRR()
calculateStandings()
determineWinner()
```

**+ addendum additions:**
```
validateFreeHitDismissal()
validateBowlerSelection()     — combines consecutive-over + max-balls checks
assignBattingOrder()
handleRetiredHurtReturn()
```

---

## 15. Row-Level Locking (addendum)

**Problem:** idempotency via `clientEventId` catches duplicate submissions of the *same* request, but not two different legitimate requests racing on the same `innings` row (e.g. a correction to an earlier ball landing at the same time as a new delivery, or an offline-queue retry colliding with a fresh live delivery).

**Fix:** `innings.version` (integer, default 0), optimistic locking:

```
SELECT innings WHERE id = X          (note version, e.g. v=7)
... compute new state ...
UPDATE innings SET ..., version = version + 1
    WHERE id = X AND version = 7

if 0 rows affected → another write happened first → 409 Conflict
    → client refetches current state and retries/re-renders
```

This sits on top of the transaction pattern (see §19) — the transaction gives atomicity, the version field guarantees the write was based on current, not stale, data.

## 16. Single-Scorer-Per-Match Enforcement (addendum, decided: yes, exactly one)

**Schema — `matches`:**
```
activeScorerId
scorerSessionToken
scorerLockedAt
```

**Logic:**
- On opening the scoring screen: if no active scorer, or the lock is stale (no heartbeat in ~90s), claim it — set `activeScorerId`, generate a fresh `scorerSessionToken`, set `scorerLockedAt = now()`.
- If a different user already holds the lock: reject with "Match is currently being scored by \<name\>."
- Scoring client sends a heartbeat (~every 20s) to keep the lock alive between deliveries.
- Every scoring write requires the current `scorerSessionToken` — if the same user opens a second tab/device, that gets a new token and invalidates the old session (prevents accidental double-tab writes).
- `SUPER_ADMIN`/`TOURNAMENT_ADMIN` can force-clear the lock (e.g. scorer's device died) — logged in `audit_logs`.

This is the actual policy that prevents the race; §15's version field is the safety net for edge-case timing gaps (mainly around undo/correction), not the primary defense.

---

## 17. Points, Standings, NRR, Qualification

**Points** — configurable per stage, not hard-coded: `pointsForWin, pointsForTie, pointsForNoResult, pointsForLoss` (typically Win=2, Tie=1, No Result=1, Loss=0), with optional bonus-win support if organizer rules require it.

**Points table** (public display):
```
POS  TEAM   P  W  L  T  NR  PTS  NRR
```

**Net Run Rate:**
```
NRR = (runs scored / overs faced) − (runs conceded / overs bowled)
overs = legalBalls / ballsPerOver     (per that match's own ballsPerOver)
```
NRR is never stored directly — only raw `runs` and `legalBalls` are stored; NRR is calculated on demand so it stays correct across matches with different balls-per-over.

**Tie-breakers** — explicit, ordered, organizer-defined, e.g.:
```
1. Points
2. NRR
3. Head-to-head
4. Number of wins
5. Other (deterministic — no "TBD" allowed if points+NRR+H2H all tie)
```

**Qualification** — configurable, not hard-coded ("top 4" etc.):
```
Calculate standings → apply tie-breakers → select qualifying teams → generate next stage
```

**Reduced overs / rain** — track `scheduledOvers` vs `actualOvers` separately. No DLS-style calculation assumed unless organizers explicitly want one; default is a manual target override (`Target: 121, Reason: Reduced innings`) recorded on the match.

**Tied matches** — configurable: Super Over, match stays tied, or another local rule. If Super Over is used, model it as a distinct innings/match phase, not bolted onto normal innings logic.

**Match/tournament states:**
```
Tournament: DRAFT → REGISTRATION → SCHEDULED → LIVE → KNOCKOUT → COMPLETED
Stage:      UPCOMING → LIVE → COMPLETED
Match:      SCHEDULED → TOSS_PENDING → READY → LIVE → INNINGS_BREAK →
            COMPLETED / ABANDONED / POSTPONED / CANCELLED / SUSPENDED
```

---

## 18. Match Finalization Flow

```
Finalize Match
  → Calculate result (backend-determined: "won by N wickets/runs", tied, no result — never typed manually by scorer)
  → Calculate player statistics
  → Calculate team statistics
  → Update tournament standings
  → Update NRR
  → Update qualification
  → Lock match (read-only for normal scorers after this)
```

Only **finalized** matches affect tournament standings — ending an innings alone does not update points.

---

## 19. Scoring Endpoint & Transaction Flow

**Endpoint:** `POST /api/innings/:inningsId/deliveries`

**Request shape:**
```json
{
  "clientEventId": "uuid",
  "strikerId": "uuid",
  "nonStrikerId": "uuid",
  "bowlerId": "uuid",
  "batsmanRuns": 4,
  "extrasRuns": 0,
  "extraType": null,
  "isLegalBall": true,
  "wicket": false
}
```

**Validation/processing order:**
```
Validate request
→ Check match is LIVE
→ Check scorer authorization (+ single-scorer lock token, §16)
→ Check striker/bowler validity
→ Check delivery sequence
→ Check bowler restriction (max balls + consecutive-over, §10/12)
→ Check duplicate clientEventId
→ Check free-hit dismissal validity if applicable (§9)
→ Create delivery
→ Update innings (with version check, §15)
→ Update batting stats
→ Update bowling stats
→ Update strike
→ Check end-of-over
→ Check innings completion
→ Transaction commits
→ Broadcast (never before commit)
```

**Transaction (conceptual):**
```
BEGIN
  INSERT delivery
  UPDATE innings
  UPDATE batsman stats
  UPDATE bowler stats
  UPDATE team score
  INSERT audit log
COMMIT
→ broadcast WebSocket
```
Any failure → ROLLBACK, no partial score ever persisted.

**Idempotency:** every scoring request carries a client-generated `clientEventId`; a duplicate (e.g. double-tap on bad network) is recognized and not double-recorded.

**Statistics architecture:** deliveries are the source of truth; stats tables (`innings_batting_stats`, `innings_bowling_stats`, etc.) are derived and updated transactionally alongside each delivery — not recalculated from scratch on every read. If a delivery is corrected, affected statistics are recalculated from that point.

---

## 20. Score Correction & Audit

- **Undo last ball** and **edit delivery** are mandatory features (e.g. change ball 17.3 from a 4 to a 6).
- Backend must recalculate all dependent data — never just change what's displayed on the frontend.
- Every correction (and every scoring action generally) writes to `audit_logs`: who, what match, what action/entity, old value → new value, timestamp.
- Corrections on a completed match should still be possible for admins but must bump `matches.updatedAt` (or equivalent) so any HTTP cache (§21) is correctly invalidated.

---

## 21. Real-Time Architecture & Public Read Scaling

**Broadcast flow:**
```
POST delivery → Express → Validate → DB transaction commits → Recalculate state
→ Socket.IO broadcast → all fans in that match's room receive update
```
Database success always precedes broadcast — never the reverse.

**Socket rooms:** one room per match, e.g. `match:abc123`. A score update for Match A never reaches fans watching Match B.

**Broadcast payload:** send full updated match state (score, wickets, legalBalls, overs, target, runRate, striker, nonStriker, bowler, lastBalls, fallOfWickets) — not just "+4 runs" — so reconnect/re-render is simple.

**Reconnection:** on reconnect, client does a fresh `GET` for current state and replaces local state — never assumes it received every missed socket message.

### Addendum: scaling reads for many concurrent viewers

Given the concern of many people watching live + browsing past-match results, reads are split into two very different caching strategies:

**Live matches — in-memory current-state cache (not a DB read per request):**
```
Delivery commits → update in-memory cache: currentState["match:abc123"] = scoreState
→ Socket.IO broadcast (live viewers get it with zero DB hit)
→ GET /api/matches/:id/live-state serves from the in-memory cache,
   not a fresh DB query — this is what a reconnecting client hits
```
Fine as process-memory for a single backend instance (matches the Render setup here). If the backend ever scales to multiple instances, this needs to move to Redis — noted as a future item, not required for v1.

**Completed/past matches — HTTP caching, since the data is immutable:**
```
GET /api/matches/:id/scorecard  (COMPLETED match)
→ Cache-Control: public, max-age=3600 (or longer)
→ cache key includes matches.updatedAt / version so a correction
   naturally busts the cache without a manual purge step
```

**Rate limiting:**
- Read endpoints (`/live-state`, `/scorecard`, `/standings`): generous per-IP limits (e.g. 60 req/min) — this is guarding against a broken client polling too fast, not malicious traffic.
- Write endpoints (`POST .../deliveries`): tight per-user limits — only authenticated scorers hit these, no legitimate reason for high frequency.

**Frontend requirement:** the public match page should only call the `GET /live-state` fallback on initial mount and on socket reconnect — never on a polling interval — since Socket.IO already pushes updates and polling on top of that defeats the point of the room-based broadcast.

---

## 22. Data Integrity Rules (server-enforced, full list)

```
A player cannot appear twice in one Playing XI.
A team cannot play against itself.
A delivery cannot belong to another innings.
A player must belong to the match squad to participate.
A bowler must belong to the bowling team's Playing XI unless rules permit otherwise.
A striker must be currently active.
A dismissed batsman cannot bat again unless retired-hurt return rules permit (§13).
A completed match cannot accept normal scoring events.
A duplicate clientEventId cannot create a second delivery.

+ addendum:
A bowler cannot bowl the over immediately following their own over.
A batter already dismissed this innings cannot be selected again
    (unless an eligible retired-hurt return).
A batter not in match_players (isPlayingXI or approved substitute)
    cannot be selected to bat.
Only one active scorer session may write to a given match at a time.
```

---

## 23. Security

- Browser is never trusted — e.g. it could send `{"runs": 999}`; backend validates everything.
- Backend owns: score, wickets, legal balls, strike, overs, winner, points, NRR. React is UI only.
- `SUPABASE_SERVICE_ROLE_KEY` never exposed to the browser.
- Auth: email/password → Argon2id hash → JWT + refresh token. Roles: `SUPER_ADMIN, TOURNAMENT_ADMIN, SCORER, VIEWER`. A scorer only has access to matches assigned to them (backed further by the §16 single-scorer lock).

---

## 24. Offline Scoring (design-ready, not necessarily v1)

```
Scorer browser → IndexedDB → pending event queue → (connection returns) →
Express API → PostgreSQL, server validates sequence on upload
```

---

## 25. API Structure

```
/api/auth
/api/tournaments, /api/tournaments/:id
/api/stages
/api/teams
/api/players
/api/squads
/api/matches, /api/matches/:id
/api/matches/:id/players
/api/matches/:id/substitutions
/api/matches/:id/innings
/api/innings/:id/deliveries
/api/matches/:id/score
/api/tournaments/:id/standings
/api/tournaments/:id/statistics
/api/matches/:id/awards
/api/tournaments/:id/awards
```

---

## 26. Public Website Structure

```
/
├── tournaments
├── tournaments/[id]   → Overview, Live Matches, Fixtures, Results,
│                        Points Table, Teams, Players, Batting, Bowling, Awards
├── matches/[id]        → Live Score, Scorecard, Ball-by-ball, Fall of wickets,
│                        Batting, Bowling, Match awards
├── teams/[id]          → Logo, name, captain, squad, matches, W/L, tournament stats
├── players/[id]         → Photo, name, team, role, matches, runs, wickets,
│                        highest score, best bowling, current + previous tournament stats
└── past-matches
```

## 27. Admin Website Structure

```
/admin
/admin/tournaments, /admin/tournaments/[id]
/admin/teams
/admin/players
/admin/matches, /admin/matches/[id]/score
/admin/awards
```

**Main admin flow:**
```
Create Tournament → Create Stages → Add Teams → Add Players → Build Squads
→ Generate Fixtures → Create Match → Select Playing XI → Toss → Start Match
→ Score → Finish Innings → Finish Match → Awards
```

## 28. Scorer UI (fast, one-handed)

```
158/5  19.2
STRIKER: Player A  62(41)      NON-STRIKER: Player B  24(18)
BOWLER: Player X  3.2-28-2

[0][1][2][3][4][6]   [WICKET]
[WIDE][NO BALL][BYE][LEG BYE]
[CHANGE STRIKE][CHANGE BOWLER][SUBSTITUTE][UNDO]
```

**+ addendum:** a "FREE HIT" badge appears when `isFreeHit` is true, and the wicket panel grays out every dismissal option except Run Out (or organizer-approved exceptions) before the scorer taps.

**Wicket UI:** dismissal type → conditional fielder field (not applicable for Bowled; required for Caught/Run Out) → bowler → confirm. Post-wicket, the scorer selects the next batter live from a filtered remaining-Playing-XI list (§13), with returning retired-hurt players distinctly labeled.

## 29. Awards UI

Match awards (after completion) and Tournament awards (after tournament completion) — only organizer-enabled award categories appear; system surfaces statistical candidates, organizer makes the final selection (not a pure auto-calculated winner).

---

## 30. Testing Checklist

**Core scoring:** 0/1/2/3/4/6 runs, wide, no-ball, bye, leg-bye, wicket (caught, bowled, LBW, run out, stumped), strike rotation, over completion, 6-ball over, 8-ball over, innings completion, target reached, all out, tie, abandoned match, substitution, undo, delivery correction, duplicate request.

**Variable balls-per-over (specifically flagged as where hard-coded assumptions break):** test 6 balls/over, 8 balls/over, 10×8, 8×6 combinations, including wide/wide/no-ball sequences vs. legal-ball counting.

**+ addendum additions:**
```
no-ball → next ball is free hit
free hit → four scored
free hit → run out allowed
free hit → bowled attempt rejected
no-ball → wide → next legal ball still free hit (wides don't clear it)

retired hurt → replacement batter → replacement out →
    retired-hurt player returns → stats continue on same row
retired hurt with canReturn=false → excluded from reselection
retired hurt → innings ends before return → recorded as
    "retired hurt, did not resume," not a dismissal
```

---

## 31. Development Phases

**Phase 1 — Foundation:** Next.js, Express, TypeScript, Prisma, Supabase, Auth, Teams, Players, Images, Tournament, Stages. (No live scoring yet.)

**Phase 2 — Match Engine:** Squads, Playing XI, Substitutes, Toss, Match, Innings, Deliveries, Batting, Bowling, Wickets, Extras, Strike, Overs, variable balls/over, plus automated tests. *(This is where the free-hit, consecutive-over, batting-order, retired-hurt, locking, and single-scorer logic from the addendum should be built in — they're all part of the match engine, not bolted on later.)*

**Phase 3 — Tournament Engine:** Points, NRR, Standings, Tie-breakers, Fixtures, Qualification, Semi-finals, Final, Awards, Statistics.

**Phase 4 — Real-Time and Production:** Socket.IO, public live score, reconnect, offline queue, audit logs, undo/correction, notifications, production deployment, monitoring, backups. *(The read-scaling/caching/rate-limiting work from the addendum belongs here.)*

---

## 32. Open Items Still Owed by Organizers

These are rules, not engineering decisions — the schema and engine are built to support whatever answer comes back, but the answer itself has to come from the tournament organizers:

```
Tournament format, stages, groups, qualification, fixtures
Overs/balls-per-over per stage; can overs change mid-match?
Max overs/balls per bowler; other bowling restrictions
Which extras apply: wide, no-ball, bye, leg-bye, penalty
Allowed dismissal types; fielder recording rules
Substitute eligibility: who, when, can they bat/bowl/return
Rain/reduced-overs handling; target revision; abandonment rules
Tie procedure: tie stands / super over / bowl-out / other
Points values (win/tie/no-result/loss/bonus)
Tie-breaker order for standings
Award categories and manual vs. automatic selection
Number of scorers, admin permission structure, offline-scoring need
```

**+ addendum flags to fold into this questionnaire:**
```
Free hit — does a wide clear free-hit status, or only a legal delivery?
Retired hurt — exact conditions for return eligibility (any time? only
    if a wicket falls while absent? cutoff over?)
Minors — if any players are under 18, confirm consent/handling for
    stored photos and date of birth (not a technical question, but
    needs an answer before Phase 1 image/player upload goes live)
```

---

## 33. Quick-Reference: Everything Added Since the Original Blueprint

**New schema fields:**
```
deliveries.isFreeHit
innings.lastOverBowlerId
innings.version
match_players.battingOrder
innings_batting_stats.retiredHurt
innings_batting_stats.canReturn
innings_batting_stats.returnedAt
matches.activeScorerId
matches.scorerSessionToken
matches.scorerLockedAt
```

**New engine functions:**
```
validateFreeHitDismissal()
validateBowlerSelection()   (consecutive-over + max-balls, combined)
assignBattingOrder()
handleRetiredHurtReturn()
```

**New cross-cutting mechanisms:**
```
Optimistic locking on innings writes (version field, 409 on conflict)
Scorer session lock on matches (heartbeat-refreshed, admin override)
In-memory live-state cache for GET /live-state (per-instance, Redis if scaled)
HTTP Cache-Control for completed matches, keyed on updatedAt/version
Tiered rate limiting: loose on public reads, tight on scoring writes
```

**New data-integrity rules:**
```
No consecutive overs by the same bowler
No re-selecting an already-dismissed batter (except eligible retired-hurt return)
No selecting a batter outside match_players' Playing XI/approved substitutes
Exactly one active scorer session may write to a match at a time
```

**One correction flagged from the original doc:** §2 originally cited Supabase's realtime connection limits (Postgres Changes) as a stack advantage — but real-time is actually handled by Socket.IO on Render, not Supabase Realtime, so that citation doesn't apply to this architecture and is worth dropping or clarifying if the doc is shared externally.

---

*Cross-checked against both source documents — original blueprint (sections 1–80) and the addendum (free hit, bowling restriction, batting order, retired hurt, locking, single-scorer enforcement, read scaling). Nothing from either source was intentionally omitted; the "Open Items" section (§32) is the one place where the platform is deliberately incomplete, because those answers have to come from your tournament organizers, not from further engineering.*
