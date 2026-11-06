# BUNYAN — Development Status

**Phase:** 2 — Learning, Library, Creator Studio
**Status:** Complete for the defined Phase 2 scope
**Last verified:** 2026-11-06
**Verified with:** Node.js 22, Next.js 16.4.5, React 19.3.1, MongoDB in-memory server

This document records what is actually implemented and verified. Anything not listed here should be
treated as not built yet, even if it appears in the roadmap or design documents.

---

## 1. Verification results

| Command                | Result                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | Pass — no TypeScript errors                                                                     |
| `npm run lint`         | Pass — 0 errors, 0 warnings                                                                     |
| `npm run format:check` | Pass — all files match Prettier style                                                           |
| `npm test`             | Pass — 7 files, 54 tests, no Mongoose deprecation warnings                                      |
| `npm run build`        | Pass — optimized production build; 27 locale page routes + `/_not-found`, 39 API handlers       |
| Runtime smoke test     | Pass — `db:dev` + `db:seed` + `next dev`; ar/en/fr pages return 200 and role/age gates redirect |

Runtime smoke test details (seeded database, development server):

- `/ar/courses`, `/ar/courses/effective-learning-foundations`, `/ar/publications`,
  `/ar/publications/letters-to-a-new-teacher`, `/en/courses` and `/fr/publications` return 200.
- Arabic pages render `dir="rtl"`; English pages render `dir="ltr"`.
- Anonymous `/ar/library`, `/ar/studio` and `/ar/studio/courses/new` return 307 to login.
- `/ar/search?q=أساسيات` returns 200 and includes the seeded course title in the results.
- The seed was run twice against the local database. Counts remained stable: 2 course modules,
  3 lessons, 3 publication chapters (2 published + 1 draft), with no duplicate lesson or chapter
  positions.

Build output summary:

- 27 locale page routes (landing, auth, communities, posts, profile, courses, lessons, publications,
  chapters, library, search, studio, dashboard, settings, 4 admin pages).
- 39 API route handlers.
- 68 static-page generation tasks complete successfully.
- All data pages are dynamic (`ƒ`); only `/_not-found` is static.
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
- Lesson completion awards 10 XP per lesson through the same anti-replay ledger. Completing the same
  lesson twice does not award additional XP.
- No XP is awarded for viewing, enrolling, liking or reading in this phase.

### 2.5 Moderation and admin

- Admin area is gated in `/[locale]/admin/layout.tsx` (`admin` role + active status only).
- Admin overview: totals for users, communities, posts, courses, publications and open reports, plus
  recent audit log.
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
  (`guardianConsentAt`) before enrolling in courses, completing lessons, or taking other social
  actions such as joining, posting, commenting or liking.
- Teens cannot create communities, author courses or publications, or hold owner/moderator roles.
- Course and publication authoring requires an active adult account with the `educator` or `admin`
  role; the rule is enforced in the service layer, not only in the UI.
- Suspended accounts are rejected at the authorization layer, not only in the UI.
- Report reasons: `spam`, `harassment`, `misinformation`, `minorSafety`, `other`.
- See `SECURITY_AND_SAFEGUARDING.md` for policy and escalation guidance.

### 2.7 Internationalization, RTL and design system

- `ar` (default), `en`, `fr`; locale-prefixed routing under `/[locale]`.
- Arabic drives `dir="rtl"`; English and French drive `dir="ltr"`.
- 578 dictionary keys per locale, verified to be in exact key parity across `ar`, `en`, `fr`.
- All user-facing labels flow through the three dictionaries; the only literal strings in the UI are
  locale-independent punctuation/separators and the avatar initials fallback glyph.
- CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) throughout.
- Theme switching (light/dark/system) via a pre-hydration script plus a hydration-safe toggle.
- UI primitives: button, card, badge, alert, avatar, empty state, field/input/textarea/select,
  pagination, page header, theme toggle, language switcher, user menu.
- Local system font stacks — no external font requests.

### 2.8 Courses and enrollment

- Course catalogue at `/[locale]/courses`: published courses only, paginated, with substring search
  and topic filtering.
- Course detail at `/[locale]/courses/[slug]`: description, module/lesson curriculum, author,
  lesson count, enrollment count, level and duration metadata.
- Draft and archived courses are not readable by learners. They remain visible to the author and to
  platform admins through the same detail route.
- Course authoring is available to active adult `educator` and `admin` accounts only.
- Enrollment:
  - A learner enrolls from the course page; anonymous visitors are prompted to sign in.
  - Enrollment is unique per `(user, course)`; repeating it returns `ALREADY_ENROLLED`.
  - Only published courses accept enrollments.
  - Consented teens may enroll; unconsented teens receive `GUARDIAN_REQUIRED`.
  - `enrollmentCount` is incremented exactly once on enrollment.
- Lessons:
  - Lessons belong to a course module and are ordered by module position then lesson position.
  - Curriculum titles and durations are visible before enrollment; lesson **content** requires
    enrollment (or course author/admin access). Fetching a lesson body without enrollment throws
    `NOT_ENROLLED`.
  - Lesson detail at `/[locale]/courses/[slug]/lessons/[lessonId]` shows content, position, previous
    and next lesson links.
  - “Mark complete” creates one immutable `lessonProgress` row per `(user, lesson)`.
  - Completion recomputes `completedLessonCount`; the enrollment becomes `completed` when the count
    reaches the course lesson count and `completedAt` is set.
  - Course progress is `completedLessonCount / lessonCount`, capped at `1`.
  - Deleting a lesson removes its progress rows and resynchronises completed enrollments.
- Publishing a course requires at least one module and one lesson; otherwise the service returns
  `CANNOT_PUBLISH_EMPTY`. Archiving is also supported.

### 2.9 Publications and reading

- Publication catalogue at `/[locale]/publications`: published publications only, paginated, with
  substring search and topic filtering.
- Publication detail at `/[locale]/publications/[slug]`: summary, description, author, chapter table
  of contents and chapter count.
- Serialized chapters:
  - Each chapter has its own `draft` or `published` status.
  - Readers only see published chapters in the table of contents and can only open published
    chapter bodies; a draft chapter returns `CHAPTER_NOT_FOUND` to non-authors.
  - Authors and admins see every chapter, including drafts, with draft badges.
  - A publication can be published only when at least one chapter is published
    (`CANNOT_PUBLISH_EMPTY`).
- Chapter reader at `/[locale]/publications/[slug]/chapters/[chapterId]`: content, previous/next
  chapter links, and author controls.
- Reading progress:
  - Stored as one row per `(user, publication)` with `lastChapterId` and a `scroll` fraction between
    `0` and `1`.
  - Saving progress requires an authenticated account.
  - Readers can only save progress against published chapters of a published publication (authors
    and admins may save against their own drafts).
  - The reader restores the saved scroll position when the saved chapter is reopened; the publication
    page exposes the last position so the reader can resume.
  - Deleting the saved chapter resets the stored scroll fraction to `0`.
- Reading published publications is public; only progress saving requires login.

### 2.10 Library, bookmarks, follows and search

- Library at `/[locale]/library` (authenticated):
  - Enrolled courses with progress and completion status.
  - Reading list with publication, last chapter and saved scroll fraction.
  - Bookmarked courses and publications.
  - Followed users, courses and publications.
- Bookmarks: idempotent toggle for courses and publications. A draft course/publication can only be
  bookmarked by its author or an admin, and draft targets return `COURSE_NOT_FOUND` /
  `PUBLICATION_NOT_FOUND` to other users.
- Follows: idempotent toggle for users, courses and publications. Self-follow returns
  `CANNOT_FOLLOW_SELF`. Only active users can be followed.
- Search at `/[locale]/search`: regex-escaped, case-insensitive substring search across published
  courses, published publications and public active communities, grouped by type with bounded
  result counts.
- Entry points are present in the site header and dashboard; authoring links are shown only to users
  who pass the adult educator/admin check.

### 2.11 Creator Studio

- Studio at `/[locale]/studio` (authenticated; non-authors see an explanatory panel):
  - Lists the viewer’s courses and publications with status badges and lesson/chapter counts.
  - Links to create a course or publication.
- Course editor at `/[locale]/studio/courses/[id]`:
  - Edit title, slug, summary, description, topic, language and level.
  - Add/edit/delete modules.
  - Add/edit/delete lessons, including title, body (up to 60,000 characters) and estimated minutes.
  - Publish, archive and open the public page.
- Publication editor at `/[locale]/studio/publications/[id]`:
  - Edit title, slug, summary, description, topic and language.
  - Add/edit/delete chapters (body up to 80,000 characters).
  - Publish or unpublish individual chapters, with draft/published badges.
  - Publish, archive and open the public page.
- All authoring mutations go through Zod-validated API routes and re-check ownership and the adult
  educator/admin rule on the server.
- There is **no autosave and no revision history** in this phase; edits are saved explicitly.

### 2.12 Seed data

`npm run db:seed` creates an idempotent demo dataset and resets the documented demo passwords:

| Role     | Email                | Username | Password          |
| -------- | -------------------- | -------- | ----------------- |
| Admin    | `admin@bunyan.local` | `admin`  | `BunyanDemo!2026` |
| Educator | `sara@bunyan.local`  | `sara`   | `BunyanDemo!2026` |
| Learner  | `omar@bunyan.local`  | `omar`   | `BunyanDemo!2026` |

The seed creates:

- Three Arabic communities (two public, one private), with posts, comments and recomputed counters.
- A demo course, `effective-learning-foundations`, with 2 modules and 3 lessons.
- A demo publication, `letters-to-a-new-teacher`, with 2 published chapters and 1 draft chapter.

Re-running the seed does not duplicate content, chapters or lessons, and does not inflate counters.

---

## 3. Architecture decisions

1. **Modular monolith.** Domain logic lives in
   `src/modules/{identity,communities,gamification,admin,learning,library}`; route handlers and React
   pages remain thin orchestration layers. No cross-module imports of models where a service function
   exists.
2. **Server-side authorization is the boundary.** Every mutation goes through a Zod-validated route
   handler, then a service call that re-checks session, account status, age policy, ownership and
   tenancy. UI hiding is never the only control.
3. **Custom JWT sessions instead of NextAuth.** Chosen for explicit control over `sessionVersion`
   invalidation, tenant checks and edge-compatible middleware. Tokens are verified in `src/proxy.ts`
   using an edge-safe module that does not import `next/headers` or Mongoose.
4. **MongoDB + Mongoose with denormalised counters.** Counters use guarded `$inc`/recompute updates;
   no multi-document transactions are required in Phase 2.
5. **Unique indexes as integrity guards.** They enforce email/username uniqueness, one membership per
   user/community, one like per user/post, one lesson completion per user/lesson, one enrollment per
   user/course, one reading position per user/publication, one bookmark/follow per target, one XP
   award per action reference, and one active report per reporter/target.
6. **Author-owned learning resources.** Courses and publications belong to an individual author, not
   to a community. Draft visibility is derived from `authorId` and platform role, so there is no
   tenant key to spoof.
7. **In-memory rate limiting behind an async interface.** Fixed-window, per-process; intentionally
   replaceable with Redis without changing callers. Documented as a production limitation.
8. **Derived dictionary type.** `Dictionary` is inferred from `ar.json`; missing or extra keys in
   `en`/`fr` fail type checking.
9. **No client-side trust for XP, roles, counters or timestamps.** All authoritative values are
   recomputed or read server-side.

---

## 4. Database collections

| Collection          | Purpose                                               | Key indexes                                                                              |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `users`             | Accounts, profiles, roles, status, age band, XP/level | unique `email`, unique `username`, `{role,status}`, `{xp:-1}`                            |
| `communities`       | Community metadata, visibility, counters              | unique `slug`, `{visibility,status,memberCount}`, `{ownerId}`, sparse `{academyId}`      |
| `memberships`       | User↔community role and status                        | unique `{communityId,userId}`, `{userId,status,updatedAt}`, `{communityId,role,status}`  |
| `posts`             | Community posts and counters                          | `{communityId,status,createdAt}`, `{authorId,createdAt}`, `{status,createdAt}`           |
| `comments`          | Post comments                                         | `{postId,status,createdAt}`, `{authorId,createdAt}`, `{communityId,createdAt}`           |
| `postlikes`         | One like per user/post                                | unique `{postId,userId}`                                                                 |
| `xpevents`          | Immutable XP ledger                                   | unique `{userId,kind,refId}`, `{userId,createdAt}`                                       |
| `reports`           | Moderation queue                                      | unique `{reporterId,targetType,targetId}`, `{status,createdAt}`, `{communityId,status}`  |
| `auditlogs`         | Administrative action trail                           | `{createdAt}`, `{actorId,createdAt}`, `{targetType,targetId}`                            |
| `courses`           | Course metadata, author, status, counters             | unique `{slug}`, `{status,publishedAt}`, `{authorId,status,updatedAt}`, `{topic,status}` |
| `coursemodules`     | Course curriculum sections                            | `{courseId,position}`                                                                    |
| `lessons`           | Lesson content and ordering                           | `{courseId,position}`, `{moduleId,position}`                                             |
| `enrollments`       | One enrollment per user/course with progress          | unique `{userId,courseId}`, `{courseId,status}`, `{userId,updatedAt}`                    |
| `lessonprogresses`  | Immutable lesson-completion evidence                  | unique `{userId,lessonId}`, `{userId,courseId,completedAt}`                              |
| `publications`      | Serialized publication metadata, author, counters     | unique `{slug}`, `{status,publishedAt}`, `{authorId,status,updatedAt}`                   |
| `chapters`          | Chapters with independent draft/published status      | `{publicationId,position}`, `{publicationId,status,position}`                            |
| `readingprogresses` | One reading position per user/publication             | unique `{userId,publicationId}`, `{userId,updatedAt}`                                    |
| `bookmarks`         | One bookmark per user/target                          | unique `{userId,targetType,targetId}`, `{userId,createdAt}`                              |
| `follows`           | One follow per follower/target                        | unique `{followerId,targetType,targetId}`, `{targetType,targetId,createdAt}`             |

No destructive migrations are needed for a fresh Phase 2 deployment; indexes are created by Mongoose
(outside production, where `autoIndex` is disabled by configuration).

---

## 5. Test coverage

All tests run against a real MongoDB instance provided by `mongodb-memory-server`; each integration
file starts and stops its own server. `fileParallelism: false` prevents cross-file database
interference.

| File                                    | Tests | Focus                                                                                    |
| --------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `tests/unit/level.test.ts`              | 5     | Level curve, cap, XP floor round-trip, progress bounds                                   |
| `tests/unit/password.test.ts`           | 9     | Password policy, bcrypt, age bands, safeguarding rules                                   |
| `tests/unit/validation.test.ts`         | 10    | Identity, community, post/comment, moderation and learning schemas                       |
| `tests/unit/authorization.test.ts`      | 6     | Session guards, teen consent, minor ownership, admin checks, learning authoring rule     |
| `tests/integration/auth.test.ts`        | 7     | Registration, age classification, duplicates, login, password rotation                   |
| `tests/integration/communities.test.ts` | 7     | Tenant isolation, private access, pending→approve, teen rules, counters, XP anti-replay  |
| `tests/integration/learning.test.ts`    | 10    | Draft isolation, enrollment gating, completion/XP, publication leaks, reading, bookmarks |

Verified Phase 2 behaviours include:

- An unpublished course is hidden from readers and from the public catalogue but remains visible to
  its author with edit controls.
- Curriculum titles are readable before enrollment while lesson bodies require enrollment.
- Enrolling twice is rejected; enrolling in a draft course is rejected.
- Completing the same lesson twice does not mint XP twice; `xpevents` contains exactly one row.
- Completing the final lesson marks the enrollment `completed`, exposes progress `1`, and stores the
  last lesson.
- A course with no module or lesson cannot be published.
- Draft publication chapters never appear in a reader’s table of contents and cannot be opened or
  have progress saved against them.
- A publication with no published chapter cannot be published.
- Reading progress restores the exact chapter and scroll fraction, moves when the reader advances,
  resets on the previous chapter, and appears in the library.
- Bookmarks and follows toggle idempotently; self-follow is rejected; draft courses cannot be
  bookmarked by non-authors.

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
npm run db:seed     # terminal 2 — demo users, communities, posts, course, publication
npm run dev         # terminal 2 — http://localhost:3000
```

Quality gates:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

---

## 8. Known limitations and deferred work

These are deliberate Phase 2 boundaries, not hidden failures:

1. **No email verification or password reset.** Accounts are active immediately; recovery is manual.
2. **No per-device session management.** Changing a password or suspending an account invalidates all
   sessions; there is no device list or selective revocation.
3. **Rate limiting is per-process and in-memory.** A multi-instance production deployment must swap
   in a shared store (e.g. Redis).
4. **Search is substring matching**, not a full-text index. Acceptable at this scale; Atlas Search or
   a dedicated engine is planned later.
5. **Avatars are external URLs only.** No upload pipeline, resizing or moderation of media. Learning
   content is plain text, not rich text or HTML.
6. **No notifications, direct messaging, autosave or revision history.** Studio edits are explicit
   and overwrite the current record.
7. **No real-time updates.** Feeds, counters and progress refresh on navigation.
8. **No content reordering UI.** Modules, lessons and chapters are appended in position order;
   reordering requires a future editor feature.
9. **Learning pathways are not built.** Phase 2 delivered courses and publications as standalone
   author-owned resources; a pathway that references courses, publications, projects and assessments
   is deferred.
10. **Playwright is configured but no end-to-end specs are committed.** `npm run e2e` requires a
    running app and database.
11. **No accessibility audit with assistive technology yet.** Baseline semantics, focus styles,
    labels and logical properties are in place; formal WCAG AA verification is pending.
12. **No deployment pipeline, backups or migration runbook yet.** Local development uses the
    documented scripts; production operations remain future work.
13. **Seed data is for development only.** Demo passwords must be changed or removed before any public
    deployment.
14. **Ownership transfer and account deletion are not implemented.** The settings page states this
    explicitly instead of offering a non-working control.
15. **No content moderation UI specifically for courses or publications.** Reports still target
    community content and profiles; platform admins can edit or archive learning content directly.

---

## 9. Next phase

Phase 3 — **Practice, Assessment, Credentials** — builds on this foundation:

- Assignments, projects, submissions and rubric-based reviews.
- Portfolios assembled from verified artefacts.
- Quizzes with question banks, attempts, and competency evidence.
- Skill profile and platform-issued achievements (clearly non-accredited).
- Peer review queues and mentor feedback.
- Learning pathways that connect courses, publications and assessments.
- Notification preferences, email verification and password reset.
- The first Playwright end-to-end suite covering registration → enroll → complete → read → bookmark,
  plus the admin report workflow.
- Replace the in-memory rate limiter with a shared store before horizontal scaling.

**Phase 2 gate (from the roadmap):** an educator publishes a course with 3+ lessons and a serialized
publication; a learner completes lessons and resumes reading at the exact position; drafts never leak.
All four conditions are covered by the implemented services, seeded content, runtime smoke test and
the 10 Phase 2 integration tests.
