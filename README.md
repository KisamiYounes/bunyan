# BUNYAN — بُنيان

**نبني المعرفة، ونبني الإنسان.**

Arabic-first educational ecosystem for communities, academies, learning, publishing and practice.

> Status: Phase 1 (Core Foundation) — see [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 + a hand-maintained shadcn-style UI layer
- MongoDB + Mongoose
- Zod contracts, `jose` sessions, bcrypt password hashing
- Vitest + Testing Library + Playwright

## Quick start

Requirements: Node.js ≥ 20.9, npm.

```bash
npm install
cp .env.example .env.local        # Windows: copy .env.example .env.local
npm run db:dev                    # terminal 1 — local MongoDB (in-memory server, persisted to .data/)
npm run db:seed                   # terminal 2 — demo users, communities, posts
npm run dev                       # terminal 2 — http://localhost:3000
```

`npm run db:dev` uses `mongodb-memory-server` for a zero-install local database and persists data
under `.data/mongo`. For a real MongoDB instance, set `MONGODB_URI` in `.env.local` instead and
skip `db:dev`.

Production database: MongoDB Atlas (or any MongoDB 7+ deployment).

### Demo accounts (after seeding)

| Role     | Email                | Password          |
| -------- | -------------------- | ----------------- |
| Admin    | `admin@bunyan.local` | `BunyanDemo!2026` |
| Educator | `sara@bunyan.local`  | `BunyanDemo!2026` |
| Learner  | `omar@bunyan.local`  | `BunyanDemo!2026` |

Change or remove these before any public deployment.

## Scripts

| Script                        | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `npm run dev`                 | Development server                        |
| `npm run build` / `npm start` | Production build / serve                  |
| `npm run typecheck`           | `tsc --noEmit`                            |
| `npm run lint`                | ESLint                                    |
| `npm test`                    | Vitest unit + integration tests           |
| `npm run test:coverage`       | Coverage report                           |
| `npm run e2e`                 | Playwright (requires a running app + DB)  |
| `npm run db:dev`              | Local persisted MongoDB via memory server |
| `npm run db:seed`             | Idempotent demo seed                      |
| `npm run format`              | Prettier                                  |

## Project documentation

- [PROJECT_VISION.md](PROJECT_VISION.md) — product, users, principles, MVP, non-goals
- [ARCHITECTURE.md](ARCHITECTURE.md) — modular monolith, stack, flows, authz, tenancy
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md) — collections, indexes, counters, lifecycle
- [EDUCATIONAL_PHILOSOPHY.md](EDUCATIONAL_PHILOSOPHY.md) — the learning cycle and its rules
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — brand, tokens, typography, RTL, components
- [SECURITY_AND_SAFEGUARDING.md](SECURITY_AND_SAFEGUARDING.md) — auth, authorization, minors
- [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) — phases and gates
- [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) — what is actually implemented

## Repository layout

```
src/app        routes, locale segments, API handlers
src/modules    identity, communities, gamification, admin (domain logic)
src/components ui primitives, shared components, layouts
src/infrastructure  database, rate limiting, logging
src/i18n       locale config and dictionaries
tests          unit, integration, e2e
scripts        local database and seed
```

## Conventions

- All user-facing text comes from `src/i18n/messages/*.json` (ar/en/fr kept in sync).
- Layout uses CSS logical properties; test RTL and LTR.
- Mutations go through Zod-validated route handlers and server-side authorization.
- Never commit `.env.local` or secrets.

## License

Proprietary — all rights reserved (to be finalized).
