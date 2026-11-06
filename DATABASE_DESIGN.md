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

### `achievements` (Phase 2)

`{ code, nameKey, descriptionKey, criteria }` and `user_achievements`
`{ userId, achievementCode, awardedAt, evidenceRef }` unique `{ userId, achievementCode }`.

## 4. Reserved for later phases (not created yet)

- Learning: `courses`, `modules`, `lessons`, `learning_pathways`, `enrollments`,
  `lesson_progress` — all tenant/course scoped with unique `{ courseId, userId, lessonId }`.
- Library: `publications`, `chapters`, `reading_progress`, `bookmarks`.
- Practice: `assignments`, `submissions`, `reviews`.
- Assessment: `quizzes`, `questions`, `attempts`, `competency_evidence`.
- Academies: `academies`, `academy_memberships`, `programs`, `cohorts`.

They are intentionally not scaffolded until their module is implemented (no empty migrations).

## 5. Relationship overview

```
User 1──* Membership *──1 Community 1──* Post 1──* Comment
  │                              │              └──* PostLike
  │                              └──* Membership (owner/moderator/member)
  └──* XpEvent
Community *──1 Academy (future, nullable)
```

## 6. Consistency and counters

- `memberCount` changes only on membership state transitions (`active` ↔ `left`/`banned`,
  `pending` → `active`), in the same service transaction-equivalent flow.
- `postCount` increments on publish and decrements on moderation removal.
- `likeCount` / `commentCount` follow the same rule.
- MongoDB single-document updates are atomic; multi-document flows use guarded updates
  (`findOneAndUpdate` with the expected previous state) and are idempotent under retry.
- A periodic reconciliation job is a Phase 2 hardening task.

## 7. Data lifecycle

- Account deletion: anonymize profile, keep authored public content attributed to
  "Deleted account" unless legally required otherwise; remove likes and memberships.
- Moderation: `status: removed` hides content from reads but preserves audit trail.
- Backups: Atlas automated backups in production; local `mongodump` documented in README.
- PII minimization: no national IDs, phone numbers or precise birth dates in Phase 1.
