# BUNYAN — Security and Safeguarding

Security is enforced on the server. The client is untrusted. Hiding a button is never an
authorization control.

## 1. Assets

- Account credentials and sessions.
- Private community content and membership lists.
- Minors' identity, age band and activity.
- Draft publications and unpublished learning material (Phase 2).
- Assessment evidence and credentials (Phase 3).
- Administrative audit trail.

## 2. Threat model (MVP)

| Threat                  | Control                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Credential stuffing     | Per-IP + per-account rate limit, generic login errors, bcrypt cost 12                                        |
| Session theft           | `httpOnly`, `Secure` in production, `SameSite=Lax`, signed JWT, short lifetime, rotation on privilege change |
| CSRF                    | SameSite cookie + `Origin`/`Host` check on every mutating request                                            |
| IDOR / tenant escape    | Every query filtered by tenant key and membership; service-level guards                                      |
| Privilege escalation    | Role read from DB user, never from token claims alone; community role loaded from membership                 |
| XSS                     | React escaping; no `dangerouslySetInnerHTML` in Phase 1; strict CSP headers                                  |
| NoSQL injection         | Zod-typed inputs; no raw object spread into queries; Mongoose casting                                        |
| Brute-force enumeration | Uniform responses, rate limits, no user-existence disclosure                                                 |
| Spam / XP farming       | Rate limits, unique XP event keys, no XP for trivial actions                                                 |
| Minor exploitation      | Age bands, guardian gate, restricted roles and visibility                                                    |
| Malicious uploads       | No binary uploads in Phase 1; URLs only, rendered as text/`img` with allowlist                               |
| Secret leakage          | Env validation, `.env*` ignored, no secrets in client bundles                                                |

## 3. Authentication

- Email + password. Email normalized (trim, lowercase). Username unique, case-insensitive.
- Password policy: 10–128 characters, checked against a small common-password blocklist.
  No forced composition rules (NIST SP 800-63B guidance). Never truncate.
- Hashing: bcrypt cost 12 (`bcryptjs`, pure JS for portability). Hash never selected by default.
- Login failures return one generic message. Timing: perform a dummy hash comparison when the
  email does not exist to reduce user enumeration.
- Session: JWT (HS256) with `sub`, `sid`, `role`, `ver`, `iat`, `exp`; 7-day expiry.
  - Cookie: `bunyan_session`, `httpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production.
  - `sessionVersion` on the user invalidates all sessions when incremented.
  - Logout clears the cookie and increments nothing (stateless); "log out everywhere" increments
    `sessionVersion` (Phase 2 UI).
- Registration rate limit: 5/hour/IP. Login: 10/15 min/IP and 5/15 min/account.
- Admin accounts are created only by seeded bootstrap or by an existing admin. Public
  registration always creates `learner`.

## 4. Authorization

Order of checks for every sensitive operation:

1. Authenticated user (`requireUser`).
2. Account active (`status === 'active'`).
3. Resource exists and is visible to the caller.
4. Caller's membership/role in the resource's tenant.
5. Specific permission (e.g. `post:delete`, `member:ban`).
6. Safeguarding constraints (age band, guardian consent).

Community permissions:

| Action                 | Owner | Moderator | Member                    | Public visitor |
| ---------------------- | ----- | --------- | ------------------------- | -------------- |
| View public community  | ✓     | ✓         | ✓                         | ✓              |
| View private community | ✓     | ✓         | ✓                         | ✗              |
| Create post            | ✓     | ✓         | ✓ (if active + consented) | ✗              |
| Delete own post        | ✓     | ✓         | ✓                         | —              |
| Delete any post        | ✓     | ✓         | ✗                         | —              |
| Approve join request   | ✓     | ✓         | ✗                         | —              |
| Change member role     | ✓     | ✗         | ✗                         | —              |
| Archive community      | ✓     | ✗         | ✗                         | —              |

Platform admin can moderate any resource, and every admin action is audited.

## 5. Input and output

- Zod schemas at every boundary (route handlers and server actions). Reject unknown keys.
- Length limits on every string; bounded page sizes for lists.
- ObjectIds validated before use.
- Markdown/rich text is **not** rendered as HTML in Phase 1. Future rich text must be sanitized
  server-side with a strict allowlist (e.g. DOMPurify + sanitize-html) before storage/display.
- User-supplied URLs are validated (`http`/`https` only) before rendering; `javascript:` rejected.
- Error responses never include stack traces, queries or secrets.

## 6. Transport and headers

- HTTPS only in production (HSTS).
- Security headers (configured in `next.config.ts`):
  `Content-Security-Policy` (self + inline styles required by Next in dev; tighten in prod),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy` disabling camera/microphone/geolocation.
- CSP is documented as a production hardening task; no third-party scripts in Phase 1.

## 7. Rate limiting

MVP adapter: in-memory fixed window (`src/infrastructure/rate-limit`). It is honest about its
limits: per-instance only. The interface is async so a Redis adapter can replace it in production.

| Endpoint       | Limit                                |
| -------------- | ------------------------------------ |
| Register       | 5 / hour / IP                        |
| Login          | 10 / 15 min / IP; 5 / 15 min / email |
| Create post    | 10 / 10 min / user                   |
| Create comment | 20 / 10 min / user                   |
| Report content | 10 / hour / user                     |
| Join/leave     | 30 / hour / user                     |

Responses use HTTP 429 with `Retry-After`.

## 8. Audit logging

`audit_logs` collection: `{ actorId, action, targetType, targetId, metadata, ipHash, createdAt }`.
Logged for: user suspension/restoration, role change, community archive, content removal,
report resolution. Immutable from the app; admin-readable only. IP is hashed with a server secret.

## 9. Child and minor protection

Age bands are derived server-side from `birthYear` at registration and never trusted from the
client afterwards.

| Band      | Definition   | Phase 1 policy                                                                                                                                         |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `child`   | under 13     | Self-registration refused. Guardian-managed accounts only (Phase 2)                                                                                    |
| `teen`    | 13–17        | May register; social participation requires guardian consent; cannot create communities, cannot hold moderator/owner roles, profile limited to members |
| `adult`   | 18+          | Standard permissions                                                                                                                                   |
| `unknown` | not provided | Treated as adult for public browsing, but blocked from age-sensitive actions until declared                                                            |

Additional rules:

- No 1:1 direct messaging in Phase 1 (feature not built). Public community discussion only.
- Minors are excluded from public leaderboards and from being displayed as "top contributors"
  until guardian consent + a dedicated safe mode exist.
- Educator/mentor roles involving minors require verification (Phase 2 workflow).
- Reports involving minors are prioritized in the admin queue.
- Data minimisation: store `birthYear`, not full date of birth; never display it.
- Account deletion and guardian requests are handled through a documented support process.
- The platform does not knowingly accept children under 13 until the guardian flow ships.

## 10. Content moderation

- Users can report posts, comments, communities and profiles with a reason code.
- Reports enter a queue; admins/moderators resolve with `removed`, `dismissed` or `escalated`.
- Removed content keeps an audit record but is excluded from reads.
- Repeat violations lead to suspension; suspensions invalidate sessions.

## 11. Secrets and environment

- `.env.local` is git-ignored. `.env.example` documents required keys without values.
- `src/shared/env.ts` validates required variables at first use (not at import time during build).
- `SESSION_SECRET` must be ≥ 32 random bytes in production; dev fallback is explicit and logged.
- No secret is ever imported into a Client Component.

## 12. Incident readiness

- Structured logs with request id, user id (not email), route, status, duration.
- Errors aggregated (Phase 2) and alerted on spike.
- Backup + restore drill documented before public launch.
- Security review checklist completed before each phase release.
