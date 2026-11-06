# BUNYAN — Architecture

## 1. Style

**Modular monolith.** One deployable Next.js application, with domain modules that own their
business rules and data access. Modules communicate through explicit service functions and shared
contracts — never by reaching into another module's Mongoose models.

This keeps the MVP cheap to operate while preserving extraction seams: identity, communities,
learning, publishing and assessment can later become services if real load justifies it.

```
Browser
  │
  ├── Next.js App Router (RSC + Client Components)
  │     ├── [locale] route groups (public / auth / dashboard / community / admin)
  │     └── Route Handlers (/api/*)  ← JSON contracts for mutations
  │
  ├── modules/*  (domain services, validation, authorization, models)
  ├── infrastructure/* (database, logging, rate limit, storage adapters)
  └── MongoDB (single logical database, tenant-scoped documents)
```

## 2. Directory map

```
src/
  app/
    [locale]/
      (auth)/              login, register
      admin/               admin overview, users, communities, reports
      communities/         list, create, detail, post detail
      courses/             catalogue, detail, lesson reader
      publications/        catalogue, detail, chapter reader
      library/             enrolled courses, reading, bookmarks, follows
      search/              cross-content search results
      studio/              course and publication authoring
      dashboard/           learner dashboard
      settings/            profile and password settings
      u/[username]/        public profile
    api/                   auth, communities, posts, moderation, courses,
                           modules, lessons, publications, chapters,
                           enrollments, progress, bookmarks, follows, search
    globals.css
  modules/
    identity/              users, sessions, passwords, RBAC, safeguards
    communities/           communities, memberships, posts, comments, likes
    gamification/          XP events, levels, leaderboard queries
    admin/                 moderation + statistics services
    learning/              courses, modules, lessons, enrollment,
                           publications, chapters, reading progress
    library/               bookmarks, follows, library aggregation, search
  components/
    ui/                    design-system primitives (shadcn-style)
    shared/                app-level composed components
    learning/              course/publication editors and action buttons
    layouts/               header, sidebar, shells
  infrastructure/
    database/              Mongoose connection + model registration
    rate-limit/            in-memory adapter (swappable)
    logging/               structured logger
  shared/
    validation/            cross-domain Zod primitives
    errors/                typed application errors
    utils/                 cn, slug, dates, pagination
  i18n/
    config.ts
    messages/{ar,en,fr}.json
  styles/
  proxy.ts                 locale resolution + edge session verification
tests/
  unit/ integration/ e2e/
docs/ (this file lives at repo root per the specification)
```

Only modules with real behaviour exist. Empty placeholder domains are deliberately not created.

## 3. Stack decisions

| Concern    | Decision                                                        | Why                                                                     |
| ---------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Framework  | Next.js 16 App Router, React 19                                 | Server components, route handlers, streaming; one deployable            |
| Language   | TypeScript strict                                               | Domain safety, refactor confidence                                      |
| Styling    | Tailwind CSS v4 + CSS variables + CVA                           | Design tokens, RTL logical properties, no runtime CSS-in-JS             |
| UI         | Hand-maintained shadcn/ui-style primitives                      | Full control, accessible, no vendor lock-in                             |
| Database   | MongoDB + Mongoose                                              | Flexible educational object metadata, document-oriented content         |
| Validation | Zod 4                                                           | One schema shared by UI and API contracts                               |
| Auth       | Signed HTTP-only session JWT (`jose`) + bcrypt + DB user lookup | Minimal surface, edge-compatible route guard, revocable via user status |
| i18n       | Typed dictionary modules + `[locale]` segment                   | No hardcoded UI text; compile-time key safety                           |
| Tests      | Vitest + Testing Library + Playwright                           | Fast unit/integration, real-browser e2e                                 |

### Why not NextAuth/Auth.js for Phase 1

The MVP needs credentials, roles and community-scoped authorization. A small, explicit session
layer keeps the security model auditable and avoids adapter/version churn. The `identity` module
exposes a stable interface, so an OAuth provider or managed identity service can be added later
without touching domain callers.

## 4. Request and data flow

- **Reads (pages):** Server Component → domain query service → Mongoose → typed view model.
  Authorization is enforced in the service call, not in JSX.
- **Mutations:** Client Component → Route Handler → Zod parse → `requireUser` →
  domain command service → DB → audit/XP side effects → JSON response → `router.refresh()`.
- **Errors:** services throw `AppError` subclasses; a shared handler maps them to
  `{ error: { code, message } }` with correct HTTP status. Unexpected errors are logged without
  leaking internals.
- **Locale:** middleware resolves `[locale]`; all user-facing strings come from dictionaries.
  Dates/numbers use `Intl` with the active locale.

## 5. Authorization model

Two layers, both server-side:

1. **Platform role** (`user.role`): `learner` | `educator` | `admin`.
2. **Tenant role** (`Membership.role` within a community): `owner` | `moderator` | `member`.

Rules:

- Identity comes only from the verified session; never from a request body or header.
- Every community query filters by membership/visibility.
- Knowing an ID never grants access. `requireCommunityMember` / `requireCommunityRole` load the
  membership row.
- Admin routes require `role === 'admin'`; client-side hiding is UX only.

Learning and library resources add an **ownership** layer on top of the platform role:

| Action                                | Anonymous | Learner | Enrolled learner | Author | Admin |
| ------------------------------------- | --------- | ------- | ---------------- | ------ | ----- |
| Browse published courses/publications | ✓         | ✓       | ✓                | ✓      | ✓     |
| Read lesson body                      | ✗         | ✗       | ✓                | ✓      | ✓     |
| Read published chapter                | ✓         | ✓       | ✓                | ✓      | ✓     |
| Read draft course/publication/chapter | ✗         | ✗       | ✗                | ✓      | ✓     |
| Enroll / complete a lesson            | ✗         | ✓\*     | —                | —      | —     |
| Create or edit learning content       | ✗         | ✗       | ✗                | ✓      | ✓     |
| Bookmark or follow                    | ✗         | ✓       | ✓                | ✓      | ✓     |

\* Consented teens may enroll and complete lessons; unconsented teens receive `GUARDIAN_REQUIRED`.
Authoring is restricted to active **adult** `educator` or `admin` accounts. Course and publication
ownership is `authorId`; there is no tenant key for a caller to spoof. A draft resource returns
“not found” to everyone except its author and platform admins.

Academies (Phase 4) will add an `AcademyMembership` with organization roles and a `tenantId` on
owned resources. The current Community model already carries optional `academyId` so the
relationship can be introduced without migration. Courses and publications are intentionally
standalone author-owned resources in Phase 2 and are not scoped to a community or academy.

## 6. Multi-tenancy

- Tenant-scoped data always carries an owner/tenant reference (`communityId`, later `academyId`).
- Queries include the tenant filter; no global collection scans for tenant content.
- Private community content is invisible to non-members at the query level.
- Compound indexes lead with tenant keys (`{ communityId: 1, createdAt: -1 }`).
- Unique constraints are tenant-scoped where appropriate (`{ communityId, userId }`).
- `memberCount`/`postCount` are denormalized counters updated atomically, not unbounded arrays.
- Courses, publications, chapters and learning progress are author/user-owned rather than
  tenant-owned. Their read filters use `status` plus `authorId`/`userId`, and draft records are only
  returned to the author or an admin.
- Every list query is explicitly paginated or bounded (`limit ≤ 100` for studio/library lists,
  `limit ≤ 50` for public catalogues).

## 7. Scalability posture

- Explicit pagination (cursor or bounded page size) on every list.
- No unbounded arrays or embedded feeds.
- Indexes designed from access patterns (see `DATABASE_DESIGN.md`).
- Counters via `$inc`; no `countDocuments` on hot paths.
- Connection reuse across serverless invocations via a cached promise.
- Stateless sessions → horizontal scaling without sticky sessions.
- In-memory rate limiting is an MVP adapter with the same interface a Redis adapter will use.

## 8. Infrastructure adapters (prepared, not over-built)

| Concern  | MVP                                      | Future seam                              |
| -------- | ---------------------------------------- | ---------------------------------------- |
| Database | MongoDB connection module                | Read replicas / Atlas                    |
| Storage  | URL-only `avatarUrl` / `coverUrl` fields | S3-compatible object storage adapter     |
| Search   | Regex/compound indexes                   | Atlas Search / Meilisearch adapter       |
| Cache    | None                                     | Redis adapter behind the same interface  |
| Jobs     | Inline side effects                      | Queue worker for notifications/analytics |
| Logging  | JSON console logger                      | OpenTelemetry exporter                   |

No Redis, broker or paid service is introduced without a measured need.

## 9. Rendering and caching

- The locale root layout is dynamic (`force-dynamic`) because the header reads the session and the
  database-backed content changes without a rebuild.
- Public and authenticated pages therefore render per request; there is no stale build-time content
  and no sensitive response is cached at the CDN.
- Mutations return JSON and the client calls `router.refresh()`; no broad cache invalidation is
  required.
- If public catalogues need CDN caching later, it must be added together with explicit invalidation
  on publish/archive mutations.

## 10. Definition of done for a module

A module is complete only when it has: Zod contracts, domain service, authorization checks,
indexed models, UI integrated end-to-end, error states, translations in all locales, unit tests
for rules, and an entry in `DEVELOPMENT_STATUS.md`.
