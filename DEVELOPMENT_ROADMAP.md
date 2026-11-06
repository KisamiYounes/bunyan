# BUNYAN — Development Roadmap

Each phase must end with a working, tested slice of the educational cycle — not a folder of
unfinished modules. A phase is complete only when its gate criteria pass.

## Phase 1 — Core Foundation (complete)

**Goal:** an Arabic-first platform where people can create accounts, build profiles, and run
learning communities with real discussion.

Delivered scope:

- [x] Documentation set and architecture decisions.
- [x] Project scaffold: Next.js 16, React 19, TypeScript strict, Tailwind 4.
- [x] i18n routing (`ar` default, `en`, `fr`), RTL/LTR, theme switching.
- [x] Design system primitives and RTL-aware layout.
- [x] Identity: register, login, logout, sessions, roles, profiles, settings.
- [x] Communities: create, browse, join/leave, public/private, roles, feed, posts, comments, likes.
- [x] Gamification foundation: XP events, anti-replay, levels.
- [x] Admin: role-gated area, user suspension, community archive, reports queue.
- [x] Safeguarding: age bands, teen restrictions, guardian consent gate.
- [x] Tests (unit + integration) and production build verification.

**Gate:** registration/login/logout work; private community content is inaccessible to
non-members; teal/role escalation attempts fail; RTL renders correctly; `npm run build`,
`npm run typecheck`, `npm test` pass.

**Deferred but designed:** per-device sessions, email verification, password reset, OAuth,
avatar uploads, full-text search, notifications.

## Phase 2 — Learning, Library, Creator Studio (complete)

**Goal:** an educator can publish structured learning content, and a learner can study it and
resume reading exactly where they stopped.

Delivered scope:

- [x] Courses → modules → lessons with ordering, estimated duration and metadata.
- [x] Course enrollment, lesson completion, resumable course progress and completion state.
- [x] Lesson completion XP with the existing unique-event anti-replay ledger.
- [x] Publications with independently drafted/published chapters and a serialized reader.
- [x] Reading progress storing the last chapter and scroll fraction, restored by the reader.
- [x] Library aggregation for enrolled courses, reading positions, bookmarks and follows.
- [x] Bookmarks and follows for users, courses and publications.
- [x] Cross-content search for published courses, publications and public communities.
- [x] Creator Studio: course settings, curriculum editor, publication settings, chapter editor,
      publish/archive controls, and ownership checks on every mutation.
- [x] Draft isolation: unpublished courses, publications and chapters never reach readers.
- [x] Unit and integration tests, including a 10-test Phase 2 integration suite.
- [x] Seeded demo course and serialized publication.

**Gate:** an educator publishes a course with 3+ lessons and a serialized publication; a learner
completes lessons and resumes reading at the exact position; drafts never leak. Verified by
`tests/integration/learning.test.ts`, the idempotent seed, the production build and a runtime smoke
test (see `DEVELOPMENT_STATUS.md`).

**Deferred from the original Phase 2 scope:** learning pathways, autosave, revision history,
notifications, email verification, password reset and notification preferences. Search shipped as
regex substring matching, not an indexed text engine.

## Phase 3 — Practice, Assessment, Credentials (next)

- Assignments, projects, submissions and rubric-based reviews.
- Portfolios assembled from verified artefacts.
- Quizzes with question banks, attempts, and competency evidence.
- Skill profile and platform-issued achievements (clearly non-accredited).
- Peer review queues and mentor feedback.

**Gate:** a learner submits a project, receives structured feedback, and the evidence appears in a
shareable portfolio; assessment replay cannot mint duplicate credentials.

## Phase 4 — Independent Academies

- Academy entity, membership, programs, cohorts, teachers, students.
- Curriculum builder and reusable learning-object references across courses.
- Academy dashboard, branding, roles, billing-ready (no payments yet).
- Tenant isolation tests across all academy-owned resources.

**Gate:** two academies operate independently; a user can belong to both; no query crosses tenant
boundaries; an academy can run a cohort end-to-end without platform staff.

## Phase 5 — Educational Network

- Academy partnerships and cross-academy enrollment.
- Research communities and shared knowledge repositories.
- Credential verification pages with issuer and evidence.
- Institution profiles and collaboration requests.

**Gate:** a credential can be verified by a third party from its stable URL.

## Phase 6 — Intelligent Education

- Recommendations grounded in learning goals and completed evidence.
- AI-assisted feedback with educator review, never autonomous credentials.
- Adaptive exercises with explainable difficulty changes.
- Learning analytics for educators and learners (private by default).

**Gate:** AI suggestions are opt-in, auditable, labelled, and never expose one learner's data to
another.

---

## Cross-cutting workstreams

| Stream        | Phases 1–2                                         | Later                                           |
| ------------- | -------------------------------------------------- | ----------------------------------------------- |
| Accessibility | WCAG AA basics, keyboard forms, logical properties | audit + screen-reader testing                   |
| Performance   | indexes, bounded queries, RSC                      | caching layer, CDN media                        |
| Observability | structured logger                                  | tracing, metrics, alerts                        |
| Security      | authz, rate limit, headers, draft isolation        | pen-test, secret rotation, CSP tighten          |
| Safeguarding  | age bands, teen limits, adult-only authoring       | guardian accounts, verification, safe messaging |
| Content ops   | report queue, draft/publish workflow               | appeals, moderation SLAs                        |
| DevOps        | local dev DB, seed, CI scripts                     | staging, backups, migrations runbook            |

## Working rules

1. Inspect before editing; preserve working code.
2. One vertical slice at a time, integrated end-to-end.
3. Update `DEVELOPMENT_STATUS.md` at the end of every phase.
4. No feature is "done" without authorization, validation, translations and tests.
5. Replace in-memory adapters only when a real requirement exists.
