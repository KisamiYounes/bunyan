# BUNYAN — Development Status

**Phase:** 1 — Core Foundation
**Status:** Complete for the defined Phase 1 scope
**Last verified:** 2026-11-06
**Verified with:** Node.js 22, Next.js 16.4.5, React 19.3.1, MongoDB in-memory server

This document records what is actually implemented and verified. Anything not listed here should be
treated as not built yet, even if it appears in the roadmap or design documents.

---

## 1. Verification results

| Command                | Result                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Pass — no TypeScript errors                                                                                          |
| `npm run lint`         | Pass — 0 errors, 0 warnings                                                                                          |
| `npm run format:check` | Pass — all files match Prettier style                                                                                |
| `npm test`             | Pass — 6 files, 44 tests, no Mongoose deprecation warnings                                                           |
| `npm run build`        | Pass — optimized production build; 14 page routes and 21 API handlers                                                |
| Runtime smoke test     | Pass — `db:dev` + `db:seed` + `next start`; ar/en/fr return 200, login sets a session, role gates redirect correctly |

Runtime smoke test details (production server, seeded database):

- `/ar` 200 with `dir="rtl"`; `/en` and `/fr` 200 with `dir="ltr"`.
- `/api/communities` returns the 3 seeded communities with the expected member/post counts.
- `POST /api/auth/login` returns 200 and a `bunyan_session` cookie.
- Anonymous `/ar/dashboard` → 307 to login; learner `/ar/dashboard` → 200.
- Learner `/ar/admin` → 307 to dashboard; admin `/ar/admin` → 200; admin `/ar/settings` → 200.
- An authenticated learner can open a private community they belong to; non-members see a locked
  preview with no posts or member list, and service-level tests confirm private content is denied.

Build output summary:

- 14 page routes (`/[locale]`, auth, communities, posts, profile, dashboard, settings, 4 admin pages).
- 21 API route handlers.
- All data pages are dynamic (`ƒ`); only `/_not-found` is static.
- 42 static-page generation tasks complete successfully.
- The Next.js/Turbopack workspace-root warning was resolved by pinning `turbopack.root` in
  `next.config.ts`.

Not yet verified (see §8): Playwright end-to-end flows, screen-reader testing, load/performance
testing, and deployment to a real MongoDB Atlas cluster.

---

## 2. Implemented scope

### 2.1 Identity and profiles

- Registration (email, username, name, password, birth year) with Zod validation.
- Login, logout, and password change.
- Custom signed JWT session (`jose`, HS256) in an `HttpOnly`, `SameSite=Lax` cookie.
- Password hashing with bcrypt (cost 12); passwords never returned by queries.
- `sessionVersion` invalidates all existing sessions whenever the password changes or an admin
  suspends an account.
- Session lookup re-reads the user from MongoDB on every request, so role/status changes take effect
  immediately.
- Public profiles at `/[locale]/u/[username]`, including bio, avatar, level, XP and recent public
  posts.
- Profile visibility: `public` or `members` (private profiles are hidden from anonymous visitors and
  non-admin viewers).
- Settings page: name, username, bio, avatar URL (https only), interface locale, profile visibility,
  password change.
- Role model: `learner`, `educator`, `admin`. Account status: `active`, `suspended`, `deleted`.

### 2.2 Communities

- Browse and search public communities (case-insensitive, regex-escaped substring search).
- Public and private communities.
- Create communities (adults only; owners become `owner` members).
- Join and leave:
  - Public → membership becomes `active` immediately.
  - Private → membership becomes `pending` and requires owner/moderator approval.
  - Private content is invisible to non-members, including pending members.
- Membership roles: `owner`, `moderator`, `member`; statuses: `active`, `pending`, `banned`, `left`.
- Owner/moderator tools: approve/reject join requests and ban members. Changing member roles,
  archiving the community and all ownership-level actions are restricted to the community owner or a
  platform admin. Moderators cannot act on the owner or on themselves.
- Community detail page with rules, member list, pending queue and paginated feed.
- Owner cannot leave their own community in Phase 1; ownership transfer is deferred.

### 2.3 Posts, comments and likes

- Community feed with pagination.
- Create posts (optional title, required body) and comments.
- Delete own posts/comments or moderate others’ content (moderator, community owner, platform admin).
- Toggle likes with a unique `(postId, userId)` constraint.
- Denormalised counters are updated transaction-free with guarded `$inc` operations:
  - community `memberCount`, `postCount`
  - post `likeCount`, `commentCount`
- Public profile feeds exclude posts from private communities unless the viewer is a member.

### 2.4 Gamification foundation

- XP awarded server-side only, from a fixed `XP_POINTS` table.
- Anti-replay: unique index on `(userId, kind, refId)`; repeating the same action cannot mint XP.
- Level curve: `level = floor(sqrt(xp / 50)) + 1`, capped at `MAX_LEVEL`.
- Dashboard shows XP, level, progress to next level, contribution counters, joined communities and
  recent posts.
- No XP is awarded for trivial actions such as viewing or liking in this phase.

### 2.5 Moderation and admin

- Admin area is gated in `/[locale]/admin/layout.tsx` (`admin` role + active status only).
- Admin overview: totals for users, communities, posts and open reports, plus recent audit log.
- User administration: search, paginate, suspend and restore. Admins cannot suspend themselves or
  another admin. Suspension increments `sessionVersion`.
- Community administration: search, paginate, archive, suspend and reactivate.
- Report queue: all/open/escalated/resolved/dismissed filters, resolve/dismiss/escalate actions.
- Users can report posts, comments, communities and user profiles with a reason and optional details.
- Reports are unique per reporter and target regardless of status: a user who already reported a
  target gets the existing report back, even if it was already resolved or dismissed. The unique
  index `{reporterId, targetType, targetId}` enforces this at the database level.
- Administrative actions write audit-log entries. Audit writes never break the recorded operation.

### 2.6 Safeguarding

- Under-13 self-registration is blocked (`MINOR_NOT_ALLOWED`).
- Ages 13–17 are classified as `teen`; they may browse but need recorded guardian consent
  (`guardianConsentAt`) before joining, posting, commenting or liking.
- Teens cannot create communities or hold owner/moderator roles.
- Suspended accounts are rejected at the authorization layer, not only in the UI.
- Report reasons: `spam`, `harassment`, `misinformation`, `minorSafety`, `other`.
- See `SECURITY_AND_SAFEGUARDING.md` for policy and escalation guidance.

### 2.7 Internationalization, RTL and design system

- `ar` (default), `en`, `fr`; locale-prefixed routing under `/[locale]`.
- Arabic drives `dir="rtl"`; English and French drive `dir="ltr"`.
- 401 dictionary keys per locale, verified to be in exact key parity across `ar`, `en`, `fr`.
- All user-facing labels flow through the three dictionaries; the only literal strings in the UI are
  locale-independent punctuation/separators and the avatar initials fallback glyph.
- CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) throughout.
- Theme switching (light/dark/system) via a pre-hydration script plus a hydration-safe toggle.
- UI primitives: button, card, badge, alert, avatar, empty state, field/input, pagination, page
  header, theme toggle, language switcher, user menu.
- Local system font stacks — no external font requests.

### 2.8 Seed data

`npm run db:seed` creates an idempotent demo dataset and resets the documented demo passwords:

| Role     | Email                | Username | Password          |
| -------- | -------------------- | -------- | ----------------- |
| Admin    | `admin@bunyan.local` | `admin`  | `BunyanDemo!2026` |
| Educator | `sara@bunyan.local`  | `sara`   | `BunyanDemo!2026` |
| Learner  | `omar@bunyan.local`  | `omar`   | `BunyanDemo!2026` |

Three Arabic communities are seeded (two public, one private), with posts, comments and recomputed
counters. Re-running the seed does not duplicate content or inflate counters.

---

## 3. Architecture decisions

1. **Modular monolith.** Domain logic lives in `src/modules/{identity,communities,gamification,admin}`;
   route handlers and React pages remain thin orchestration layers. No cross-module imports of models
   where a service function exists.
2. **Server-side authorization is the boundary.** Every mutation goes through a Zod-validated route
   handler, then a service call that re-checks session, account status, age policy and tenancy
   (membership). UI hiding is never the only control.
3. **Custom JWT sessions instead of NextAuth.** Chosen for explicit control over `sessionVersion`
   invalidation, tenant checks and edge-compatible middleware. Tokens are verified in `src/proxy.ts`
   using an edge-safe module that does not import `next/headers` or Mongoose.
4. **MongoDB + Mongoose with denormalised counters.** Counters use guarded `$inc` updates; no
   multi-document transactions are required in Phase 1.
5. **Unique indexes as integrity guards.** They enforce email/username uniqueness, one membership per
   user/community, one like per user/post, one XP award per action reference, and one active report
   per reporter/target.
6. **In-memory rate limiting behind an async interface.** Fixed-window, per-process; intentionally
   replaceable with Redis without changing callers. Documented as a production limitation.
7. **Derived dictionary type.** `Dictionary` is inferred from `ar.json`; missing or extra keys in
   `en`/`fr` fail type checking.
8. **No client-side trust for XP, roles, counters or timestamps.** All authoritative values are
   recomputed or read server-side.

---

## 4. Database collections

| Collection    | Purpose                                               | Key indexes                                                                                                               |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `users`       | Accounts, profiles, roles, status, age band, XP/level | unique `email`, unique `username`, `{role,status}`, `{xp:-1}`                                                             |
| `communities` | Community metadata, visibility, counters              | unique `slug`, `{visibility,status,memberCount}`, `{ownerId}`, sparse `{academyId}`, `{topic,status}`                     |
| `memberships` | User↔community role and status                        | unique `{communityId,userId}`, `{userId,status,updatedAt}`, `{communityId,role,status}`, `{communityId,status,createdAt}` |
| `posts`       | Community posts and counters                          | `{communityId,status,createdAt}`, `{authorId,createdAt}`, `{status,createdAt}`                                            |
| `comments`    | Post comments                                         | `{postId,status,createdAt}`, `{authorId,createdAt}`, `{communityId,createdAt}`                                            |
| `postlikes`   | One like per user/post                                | unique `{postId,userId}`                                                                                                  |
| `xpevents`    | Immutable XP ledger                                   | unique `{userId,kind,refId}`, `{userId,createdAt}`                                                                        |
| `reports`     | Moderation queue                                      | unique `{reporterId,targetType,targetId}`, `{status,createdAt}`, `{communityId,status}`                                   |
| `auditlogs`   | Administrative action trail                           | `{createdAt}`, `{actorId,createdAt}`, `{targetType,targetId}`                                                             |

No destructive migrations are needed for a fresh Phase 1 deployment; indexes are created by Mongoose
(outside production, where `autoIndex` is disabled by configuration).

---

## 5. Test coverage

All tests run against a real MongoDB instance provided by `mongodb-memory-server`; each integration
file starts and stops its own server. `fileParallelism: false` prevents cross-file database
interference.

| File                                    | Tests | Focus                                                                                   |
| --------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `tests/unit/level.test.ts`              | 5     | Level curve, cap, XP floor round-trip, progress bounds                                  |
| `tests/unit/password.test.ts`           | 9     | Password policy, bcrypt, age bands, safeguarding rules                                  |
| `tests/unit/validation.test.ts`         | 10    | Identity, community, post/comment and moderation schemas                                |
| `tests/unit/authorization.test.ts`      | 6     | Session guards, teen consent, minor ownership, admin checks                             |
| `tests/integration/auth.test.ts`        | 7     | Registration, age classification, duplicates, login, password rotation                  |
| `tests/integration/communities.test.ts` | 7     | Tenant isolation, private access, pending→approve, teen rules, counters, XP anti-replay |

Verified behaviours include:

- Adult registration hashes passwords; under-13 registration is rejected.
- Duplicate email/username produce distinct `EMAIL_TAKEN`/`USERNAME_TAKEN` errors.
- Wrong passwords and wrong current passwords are rejected.
- Password change rotates `sessionVersion` and invalidates the old password.
- Private communities return `canView=false` to non-members; pending memberships do not grant access.
- Approving a pending membership activates it and increments `memberCount` exactly once.
- Non-members cannot post; teens without consent cannot join; consented teens can.
- Teens cannot create communities even with consent.
- Post/comment/like counters stay consistent; XP is awarded once per action reference.
- Public profile feeds never leak private-community posts.

Not covered by automated tests yet: browser-level RTL/LTR rendering, full Playwright journeys,
accessibility audit, rate-limit exhaustion, and admin UI interactions.

---

## 6. Runtime configuration

Required environment variables (`.env.example`):

| Variable              | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `MONGODB_URI`         | MongoDB connection string                                                 |
| `SESSION_SECRET`      | ≥32 characters; required in production (dev falls back to a local secret) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for metadata                                            |
| `NODE_ENV`            | `development` or `production`                                             |

Security headers are set in `next.config.ts`: CSP, HSTS (production only), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, strict referrer policy, and a restrictive permissions policy.

---

## 7. How to run

```bash
npm install
copy .env.example .env.local
npm run db:dev      # terminal 1 — persisted in-memory MongoDB under .data/
npm run db:seed     # terminal 2 — demo users and content
npm run dev         # terminal 2 — http://localhost:3000
```

Quality gates:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

---

## 8. Known limitations and deferred work

These are deliberate Phase 1 boundaries, not hidden failures:

1. **No email verification or password reset.** Accounts are active immediately; recovery is manual.
2. **No per-device session management.** Changing a password or suspending an account invalidates all
   sessions; there is no device list or selective revocation.
3. **Rate limiting is per-process and in-memory.** A multi-instance production deployment must swap
   in a shared store (e.g. Redis).
4. **Search is substring matching**, not a full-text index. Acceptable at Phase 1 scale; Atlas Search
   is planned later.
5. **Avatars are external URLs only.** No upload pipeline, resizing or moderation of media. The avatar
   component intentionally uses `<img>` because remote hosts are user-supplied.
6. **No notifications, follows, bookmarks or direct messaging.**
7. **No real-time updates.** Feeds and counters refresh on navigation.
8. **Playwright is configured but no end-to-end specs are committed.** `npm run e2e` requires a
   running app and database.
9. **No accessibility audit with assistive technology yet.** Baseline semantics, focus styles,
   labels and logical properties are in place; formal WCAG AA verification is pending.
10. **No deployment pipeline, backups or migration runbook yet.** The repository is not initialized as
    a git repository in this workspace.
11. **Seed data is for development only.** Demo passwords must be changed or removed before any public
    deployment.
12. **Ownership transfer and account deletion are not implemented.** The settings page states this
    explicitly instead of offering a non-working control.

---

## 9. Next phase

Phase 2 — **Learning, Library, Creator Studio** — builds on this foundation:

- Courses → modules → lessons, with lesson completion and resumable progress.
- Learning pathways that reference courses, publications, projects and assessments.
- Publications as serialized chapters with drafts, previews, publish and revision history.
- Reading progress, bookmarks, follows and library discovery.
- Creator Studio authoring surface with autosave.
- Indexed search and notifications.
- Email verification, password reset and notification preferences.
- The first Playwright end-to-end suite covering registration → join → post → comment, and the admin
  report workflow.
- Replace the in-memory rate limiter with a shared store before horizontal scaling.

**Phase 2 gate (from the roadmap):** an educator publishes a course with 3+ lessons and a serialized
publication; a learner completes lessons and resumes reading at the exact position; drafts never leak.
