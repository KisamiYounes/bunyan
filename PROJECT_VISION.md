# BUNYAN — Product Vision

**بُنيان — نبني المعرفة، ونبني الإنسان.**

> بناء منظومة عربية يُنتج فيها العلم، ويُتبادل، ويُمارس، ويتحوّل إلى قدرات تصنع المستقبل.

## 1. What BUNYAN is

BUNYAN is an Arabic-first educational ecosystem, not a single course platform. It provides the
shared infrastructure through which individuals, educators, communities, academies, schools and
institutions can compose their own educational experiences.

The product is built around one complete educational cycle:

**Discover → Understand → Discuss → Practice → Demonstrate → Contribute**

Every feature must strengthen at least one step of that cycle. Features that only increase
engagement metrics without deepening learning are out of scope.

## 2. Who it serves

| Actor                    | Primary needs                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Learner                  | Discover knowledge, learn in a structured way, practice, prove competence, build a portfolio |
| Educator                 | Author content, run a community, teach a cohort, give feedback, measure understanding        |
| Academy / organization   | Assemble programs, manage teachers and learners, operate with logical isolation              |
| Researcher / contributor | Publish, collaborate, review, preserve knowledge                                             |
| Administrator            | Moderate content, protect minors, audit sensitive actions                                    |

BUNYAN must support learners across life stages. Age is an architectural concern (permissions,
privacy, interaction rules), not a cosmetic profile field.

## 3. Design principles

1. **Arabic first, multilingual by design.** Arabic is the default locale and RTL is the primary
   layout direction. English and French are first-class translations, never afterthoughts.
2. **Understanding before memorization.** Assessments should capture explanation, application,
   analysis and creation — not only recall.
3. **Theory connected to practice.** Learning objects can be practised through exercises,
   projects, case studies and research.
4. **Learners become educators.** The same person can consume, contribute, mentor and teach.
5. **Education is social.** Communities, peer review and mentorship are core, not add-ons.
6. **Knowledge is preserved.** The library is a durable, citable body of Arabic knowledge.
7. **Composable education.** Communities, courses, pathways, publications, projects and
   assessments are reusable building blocks. No single pedagogical model is hardcoded.
8. **Flexible by architecture, opinionated by defaults.** The platform offers good default
   learning experiences while letting academies compose their own.
9. **Safety is foundational.** Minors, private communities and personal data are protected by
   default, not by configuration.
10. **Measure learning, not noise.** XP and achievements are tied to verified educational actions.

## 4. Eight domains (progressive, bounded)

| Domain                   | Responsibility                                              | Phase |
| ------------------------ | ----------------------------------------------------------- | ----- |
| Identity                 | Accounts, sessions, profiles, roles, permissions            | 1     |
| Communities              | Public/private communities, membership, discussions, events | 1     |
| Learning                 | Courses, modules, lessons, progress, pathways               | 2     |
| Library / Publishing     | Books, series, articles, reading progress, bookmarks        | 2     |
| Creator Studio           | Authoring, drafts, previews, publishing workflows           | 2     |
| Practice Lab             | Assignments, projects, submissions, reviews, portfolios     | 3     |
| Assessment & Credentials | Quizzes, competency evidence, verified achievements         | 3     |
| Educational Network      | Academy collaboration, partnerships, cross-academy learning | 4     |

Intelligent learning infrastructure (recommendations, AI assistance, analytics) is Phase 5 and
must remain assistive. It never replaces educator judgement or issues credentials autonomously.

## 5. MVP (Phase 1) — what this repository delivers first

In scope:

- Arabic-first shell with full RTL, locale routing (`ar`, `en`, `fr`) and theme switching.
- Identity: registration, login, logout, secure sessions, roles, profile and account settings.
- Communities: create, browse, join/leave, public/private visibility, owner/mod/member roles,
  feed, posts, comments, likes.
- Profiles: public learner/educator profile with contribution summary.
- Gamification foundation: XP events with anti-replay, levels, leaderboard-ready model.
- Administration foundation: role-gated admin area, user listing, community moderation hooks.
- Safeguarding foundation: age bands, minor restrictions, server-side authorization everywhere.
- Documentation, unit/integration tests, build and verification scripts.

Explicitly deferred: payments, video hosting, live streaming, native apps, AI tutors, formal
accreditation, microservices, blockchain/tokens.

## 6. Non-goals

BUNYAN is not a video-course marketplace, a social network with an education skin, a certificate
factory, or a centrally controlled institution. It does not equate popularity with expertise and
does not reward empty activity.

## 7. Success signals

- An educator can open an academy/community, publish material and run a discussion without
  platform staff.
- A learner can move from discovery to a demonstrable artefact (project, assessment, publication).
- Arabic content is readable, searchable and properly typeset on every screen.
- Permissions hold under direct API access, across tenants.
- Contributors return because their work is preserved and credited.
