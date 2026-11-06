# BUNYAN — Database Design

Database: **MongoDB** via Mongoose. Database name: `bunyan` (configurable).

Design rules:

- Collections are domain-owned; no cross-module model imports.
- Every tenant-scoped document stores the tenant key explicitly.
- No unbounded embedded arrays. Feeds and lists are collections with indexes.
- Counters are denormalized integers maintained with atomic `$inc`.
- All timestamps are UTC; presentation is locale-aware.
- Soft-delete only where moderation/history requires it (`deletedAt`), never as a default.

## 1. Identity

### `users`

| Field                     | Type     | Notes                                                                  |
| ------------------------- | -------- | ---------------------------------------------------------------------- |
| `_id`                     | ObjectId |                                                                        |
| `email`                   | string   | unique, lowercase, trimmed                                             |
| `username`                | string   | unique, lowercase, 3–30, `[a-z0-9_]`                                   |
| `name`                    | string   | display name, Arabic allowed                                           |
| `passwordHash`            | string   | bcrypt (cost 12), `select: false`                                      |
| `role`                    | enum     | `learner` \| `educator` \| `admin`                                     |
| `status`                  | enum     | `active` \| `suspended` \| `deleted`                                   |
| `locale`                  | enum     | `ar` \| `en` \| `fr`                                                   |
| `bio`                     | string   | max 600                                                                |
| `avatarUrl`               | string?  | external URL (no binary in Mongo)                                      |
| `birthYear`               | number?  | used only to derive `ageBand`; never shown publicly                    |
| `ageBand`                 | enum     | `child` (<13, blocked) \| `teen` (13–17) \| `adult` (18+) \| `unknown` |
| `guardianConsentAt`       | Date?    | required for teen accounts before social participation                 |
| `xp`                      | number   | denormalized total, default 0                                          |
| `level`                   | number   | derived, persisted for sorting                                         |
| `profileVisibility`       | enum     | `public` \| `members`                                                  |
| `sessionVersion`          | number   | increment to invalidate all sessions                                   |
| `createdAt` / `updatedAt` | Date     |                                                                        |

Indexes: `{ email: 1 }` unique, `{ username: 1 }` unique, `{ role: 1, status: 1 }`,
`{ xp: -1 }`.

Safety: `passwordHash`, `email`, `birthYear` are never returned by public profile queries.
`select: false` on `passwordHash`; explicit projection elsewhere.

### `sessions` (optional revocation ledger)

Stateless JWTs are the primary mechanism. This collection is used only when a session must be
revoked individually (e.g. "log out everywhere"). `{ userId, tokenId, userAgentHash, createdAt,
expiresAt, revokedAt }`, TTL index on `expiresAt`, index `{ userId: 1 }`. Phase 1 uses
`sessionVersion` for global revocation and defers per-device sessions.

## 2. Communities

### `communities`

| Field                     | Type             | Notes                                       |
| ------------------------- | ---------------- | ------------------------------------------- |
| `name`                    | string           | 3–80                                        |
| `slug`                    | string           | unique, URL-safe, immutable after creation  |
| `description`             | string           | max 1000                                    |
| `visibility`              | enum             | `public` \| `private`                       |
| `ownerId`                 | ObjectId → users | immutable in Phase 1                        |
| `academyId`               | ObjectId?        | reserved for Phase 3 tenant link            |
| `topic`                   | string?          | free-form discipline tag (`programming`, …) |
| `language`                | enum             | `ar` \| `en` \| `fr`                        |
| `memberCount`             | number           | atomic counter                              |
| `postCount`               | number           | atomic counter                              |
| `rules`                   | string?          | community guidelines, max 4000              |
| `status`                  | enum             | `active` \| `archived` \| `suspended`       |
| `createdAt` / `updatedAt` | Date             |                                             |

Indexes: `{ slug: 1 }` unique, `{ visibility: 1, status: 1, memberCount: -1 }`,
`{ ownerId: 1 }`, `{ academyId: 1 }` sparse.

### `memberships`

| Field         | Type                   | Notes                                       |
| ------------- | ---------------------- | ------------------------------------------- |
| `communityId` | ObjectId → communities | tenant key                                  |
| `userId`      | ObjectId → users       |                                             |
| `role`        | enum                   | `owner` \| `moderator` \| `member`          |
| `status`      | enum                   | `active` \| `pending` \| `banned` \| `left` |
| `joinedAt`    | Date                   |                                             |
| `updatedAt`   | Date                   |                                             |

Indexes: `{ communityId: 1, userId: 1 }` **unique**, `{ userId: 1, status: 1, updatedAt: -1 }`,
`{ communityId: 1, role: 1, status: 1 }`.

Private communities: join creates `status: pending`; owner/moderator approval flips to `active`
and increments `memberCount` exactly once.

### `posts`

| Field                     | Type     | Notes                        |
| ------------------------- | -------- | ---------------------------- |
| `communityId`             | ObjectId | tenant key                   |
| `authorId`                | ObjectId |                              |
| `title`                   | string?  | optional for short posts     |
| `body`                    | string   | 1–10000, sanitized at render |
| `likeCount`               | number   | atomic                       |
| `commentCount`            | number   | atomic                       |
| `status`                  | enum     | `published` \| `removed`     |
| `createdAt` / `updatedAt` | Date     |                              |

Indexes: `{ communityId: 1, status: 1, createdAt: -1 }`, `{ authorId: 1, createdAt: -1 }`.

### `comments`

`{ postId, communityId, authorId, body (1–3000), status, createdAt }`.
Indexes: `{ postId: 1, status: 1, createdAt: 1 }`, `{ authorId: 1, createdAt: -1 }`.

### `post_likes`

`{ postId, userId, createdAt }` with unique `{ postId: 1, userId: 1 }`.
Likes are idempotent: insert conflict means already liked; unliking deletes exactly one row and
decrements the counter only if a row was removed.

## 3. Gamification

### `xp_events`

| Field       | Notes                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `userId`    | recipient                                                                                              |
| `kind`      | `post_created` \| `comment_created` \| `lesson_completed` \| `assessment_passed` \| `project_reviewed` |
| `refId`     | ObjectId of the credited resource                                                                      |
| `points`    | positive integer, server-assigned                                                                      |
| `createdAt` | Date                                                                                                   |

Indexes: `{ userId: 1, createdAt: -1 }`, **unique** `{ userId: 1, kind: 1, refId: 1 }`.

The unique key is the anti-exploitation mechanism: replaying the same action cannot mint XP.
Points per kind are constants in the gamification module; client input is ignored.
Level is derived: `floor(sqrt(xp / 50)) + 1`, capped for display at 99.

### `achievements` (not created yet)

Reserved for Phase 3: `{ code, nameKey, descriptionKey, criteria }` and `user_achievements`
`{ userId, achievementCode, awardedAt, evidenceRef }` unique `{ userId, achievementCode }`.

## 4. Learning

Courses, modules, lessons and enrollment records are **author-owned resources**, not tenant-scoped
community content. Access to drafts is derived from `authorId` plus platform role.

### `courses`

| Field                     | Type             | Notes                                        |
| ------------------------- | ---------------- | -------------------------------------------- |
| `authorId`                | ObjectId → users | active adult educator or admin               |
| `title`                   | string           | 3–140                                        |
| `slug`                    | string           | unique, URL-safe, lowercase                  |
| `summary`                 | string           | max 400                                      |
| `description`             | string           | max 8000, plain text                         |
| `topic`                   | enum?            | discipline tag from the shared `TOPICS` list |
| `language`                | enum             | `ar` \| `en` \| `fr`                         |
| `level`                   | enum             | `beginner` \| `intermediate` \| `advanced`   |
| `status`                  | enum             | `draft` \| `published` \| `archived`         |
| `lessonCount`             | number           | recomputed from `lessons`                    |
| `enrollmentCount`         | number           | incremented exactly once per enrollment      |
| `publishedAt`             | Date?            | set on first publish                         |
| `createdAt` / `updatedAt` | Date             |                                              |

Indexes: `{ slug: 1 }` unique, `{ status: 1, publishedAt: -1 }`,
`{ authorId: 1, status: 1, updatedAt: -1 }`, `{ topic: 1, status: 1 }`.

### `coursemodules`

`{ courseId, title (2–140), summary? (max 600), position, createdAt, updatedAt }`.
Index: `{ courseId: 1, position: 1 }`. Modules are appended; the position is the current module count
at creation time.

### `lessons`

`{ courseId, moduleId, title (2–180), content (1–60000, plain text), position, estimatedMinutes
(1–600), createdAt, updatedAt }`.
Indexes: `{ courseId: 1, position: 1 }`, `{ moduleId: 1, position: 1 }`.

Lessons have **no per-lesson status**. The parent course status gates learner access. Deleting a
lesson also deletes its `lessonprogresses` rows and recomputes `courses.lessonCount`.

### `enrollments`

| Field                  | Type                | Notes                                  |
| ---------------------- | ------------------- | -------------------------------------- |
| `userId`               | ObjectId → users    |                                        |
| `courseId`             | ObjectId → courses  |                                        |
| `status`               | enum                | `active` \| `completed`                |
| `completedLessonCount` | number              | recomputed from `lessonprogresses`     |
| `lastLessonId`         | ObjectId? → lessons | most recently completed lesson         |
| `lastAccessedAt`       | Date                | updated on enrollment and completion   |
| `completedAt`          | Date?               | set when the final lesson is completed |

Indexes: **unique** `{ userId: 1, courseId: 1 }`, `{ courseId: 1, status: 1 }`,
`{ userId: 1, updatedAt: -1 }`.

Only published courses accept new enrollments. The unique key makes double enrollment impossible
even under concurrent requests.

### `lessonprogresses`

`{ userId, courseId, lessonId, completedAt }` with **unique** `{ userId, lessonId }` and
`{ userId, courseId, completedAt }`.

One row means “this learner completed this lesson”. The row is immutable; replaying completion finds
the existing row, awards no new XP, and recomputes the same counts.

## 5. Library

### `publications`

| Field                     | Type             | Notes                                |
| ------------------------- | ---------------- | ------------------------------------ |
| `authorId`                | ObjectId → users | active adult educator or admin       |
| `title`                   | string           | 3–160                                |
| `slug`                    | string           | unique, URL-safe, lowercase          |
| `summary`                 | string           | max 400                              |
| `description`             | string           | max 8000, plain text                 |
| `topic`                   | enum?            | discipline tag                       |
| `language`                | enum             | `ar` \| `en` \| `fr`                 |
| `status`                  | enum             | `draft` \| `published` \| `archived` |
| `chapterCount`            | number           | number of **published** chapters     |
| `publishedAt`             | Date?            | set on first publish                 |
| `createdAt` / `updatedAt` | Date             |                                      |

Indexes: `{ slug: 1 }` unique, `{ status: 1, publishedAt: -1 }`,
`{ authorId: 1, status: 1, updatedAt: -1 }`.

Publishing requires at least one published chapter. Draft publications are visible only to their
author and platform admins.

### `chapters`

`{ publicationId, title (2–180), content (1–80000, plain text), position, status, publishedAt?,
createdAt, updatedAt }` where `status` is `draft` | `published`.

Indexes: `{ publicationId: 1, position: 1 }`, `{ publicationId: 1, status: 1, position: 1 }`.

Readers only receive chapters with `status: 'published'`. Each chapter is independently publishable
and unpublishable; `publications.chapterCount` is recomputed from published chapters.

### `readingprogresses`

| Field           | Type                    | Notes                                     |
| --------------- | ----------------------- | ----------------------------------------- |
| `userId`        | ObjectId → users        |                                           |
| `publicationId` | ObjectId → publications |                                           |
| `lastChapterId` | ObjectId → chapters     | last chapter the reader was on            |
| `scroll`        | number                  | fraction scrolled within the chapter, 0–1 |
| `updatedAt`     | Date                    |                                           |

Indexes: **unique** `{ userId: 1, publicationId: 1 }`, `{ userId: 1, updatedAt: -1 }`.

The reader restores both the chapter and the scroll fraction. Progress can only target published
chapters unless the caller is the author or an admin. Deleting the referenced chapter resets the
stored scroll fraction to `0`.

### `bookmarks`

`{ userId, targetType, targetId, createdAt }` where `targetType` is `course` | `publication`.

Indexes: **unique** `{ userId: 1, targetType: 1, targetId: 1 }`, `{ userId: 1, createdAt: -1 }`.

Toggling inserts or deletes exactly one row. Draft targets can only be bookmarked by their author or
an admin.

### `follows`

`{ followerId, targetType, targetId, createdAt }` where `targetType` is `user` | `course` |
`publication`.

Indexes: **unique** `{ followerId: 1, targetType: 1, targetId: 1 }`,
`{ targetType: 1, targetId: 1, createdAt: -1 }`.

Self-follows are rejected before insert. Only active users can be followed.

## 6. Reserved for later phases (not created yet)

- Learning: `learning_pathways` connecting courses, publications, projects and assessments.
- Practice: `assignments`, `submissions`, `reviews`.
- Assessment: `quizzes`, `questions`, `attempts`, `competency_evidence`.
- Academies: `academies`, `academy_memberships`, `programs`, `cohorts`.
- Operations: `notifications`, `email_verification_tokens`, `password_reset_tokens`.

They are intentionally not scaffolded until their module is implemented (no empty migrations).

## 7. Relationship overview

```
User 1──* Membership *──1 Community 1──* Post 1──* Comment
  │                              │              └──* PostLike
  │                              └──* Membership (owner/moderator/member)
  ├──* XpEvent
  ├──* Enrollment *──1 Course 1──* CourseModule 1──* Lesson
  ├──* LessonProgress *──1 Lesson
  ├──* ReadingProgress *──1 Publication 1──* Chapter
  ├──* Bookmark (course | publication)
  └──* Follow (user | course | publication)

Community *──1 Academy (future, nullable)
```

## 8. Consistency and counters

- `memberCount` changes only on membership state transitions (`active` ↔ `left`/`banned`,
  `pending` → `active`), in the same service transaction-equivalent flow.
- `postCount` increments on publish and decrements on moderation removal.
- `likeCount` / `commentCount` follow the same rule.
- `courses.lessonCount` is recomputed after module/lesson creation or deletion and used to mark
  enrollments `completed` when the completed count reaches it.
- `courses.enrollmentCount` increments exactly once per enrollment; there is no unenroll flow yet.
- `publications.chapterCount` counts published chapters and is recomputed when chapter status changes
  or a chapter is deleted.
- `enrollments.completedLessonCount` and `status` are recomputed from immutable lesson-progress rows
  after each completion.
- MongoDB single-document updates are atomic; multi-document flows use guarded updates
  (`findOneAndUpdate` with the expected previous state) and are idempotent under retry.
- A periodic reconciliation job remains a hardening task.

## 9. Data lifecycle

- Account deletion: anonymize profile, keep authored public content attributed to
  "Deleted account" unless legally required otherwise; remove likes and memberships.
- Learning content: archiving a course or publication hides it from catalogues and blocks reader
  access; enrollment and reading-progress rows are retained, so republishing restores the history.
  Hard deletion of courses or publications is not exposed in the UI.
- Lesson deletion removes that lesson's progress rows and recomputes enrollment completion.
- Chapter deletion resets affected reading positions to the start of the stored chapter.
- Backups: Atlas automated backups in production; local `mongodump` documented in README.
- PII minimization: no national IDs, phone numbers or precise birth dates in Phases 1–2.
