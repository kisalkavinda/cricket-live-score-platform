# 🏏 Computing Premier League — Web Application

This directory contains the primary **Next.js 16** full-stack application for the **Computing Premier League (CPL)** cricket tournament platform.

For full architectural documentation, feature overviews, live deployment links, and setup guides, please refer to the root [README.md](../../README.md).

---

## 🌐 Live Production
- **Live URL:** [https://computing-premier-league.vercel.app/](https://computing-premier-league.vercel.app/)

---

## 🚀 Quick Start for `apps/web`

```bash
# Run from repository root
npm run dev --workspace=web

# Or from apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📦 Key Directory Map

- `app/` — Next.js App Router pages (Home, Tournament Hub, Draw Ceremony, Scorecard, Stadium Display, Stealth Admin)
- `components/` — Reusable presentation and interaction components
- `lib/scoring/` — Real-time scoring state, ball-by-ball actions, and validation
- `lib/offline/` — IndexedDB local cache and background sync engine
- `lib/tournament/` — NRR calculation, bracket generator, and stage progression
- `lib/auth/` — Stealth admin authentication, rate limiting, and cryptographic session cookies
- `config/` — Tournament configuration and CPL ruleset
