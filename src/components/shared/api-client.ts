export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody }

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      credentials: 'same-origin',
    })

    const text = await response.text()
    const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

    if (!response.ok) {
      const error = payload.error as ApiErrorBody | undefined
      return {
        ok: false,
        error: {
          code: error?.code ?? 'INTERNAL_ERROR',
          message: error?.message ?? 'Request failed',
          details: error?.details,
        },
      }
    }

    return { ok: true, data: payload as T }
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK', message: 'Network error' },
    }
  }
}

const ERROR_KEYS: Record<string, string> = {
  VALIDATION_ERROR: 'validation',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'notFound',
  RATE_LIMITED: 'rateLimited',
  INVALID_CREDENTIALS: 'invalidCredentials',
  EMAIL_TAKEN: 'emailTaken',
  USERNAME_TAKEN: 'usernameTaken',
  WEAK_PASSWORD: 'weakPassword',
  MINOR_NOT_ALLOWED: 'minorNotAllowed',
  GUARDIAN_REQUIRED: 'guardianRequired',
  COMMUNITY_NOT_FOUND: 'communityNotFound',
  COMMUNITY_PRIVATE: 'communityPrivate',
  NOT_MEMBER: 'notMember',
  ALREADY_MEMBER: 'alreadyMember',
  POST_NOT_FOUND: 'postNotFound',
  COURSE_NOT_FOUND: 'courseNotFound',
  COURSE_NOT_PUBLISHED: 'courseNotPublished',
  LESSON_NOT_FOUND: 'lessonNotFound',
  ALREADY_ENROLLED: 'alreadyEnrolled',
  NOT_ENROLLED: 'notEnrolled',
  PUBLICATION_NOT_FOUND: 'publicationNotFound',
  PUBLICATION_NOT_PUBLISHED: 'publicationNotPublished',
  CHAPTER_NOT_FOUND: 'chapterNotFound',
  CANNOT_PUBLISH_EMPTY: 'cannotPublishEmpty',
  CANNOT_FOLLOW_SELF: 'cannotFollowSelf',
  ACCOUNT_SUSPENDED: 'accountSuspended',
  REPORT_NOT_FOUND: 'reportNotFound',
  USER_NOT_FOUND: 'userNotFound',
  CANNOT_SUSPEND_SELF: 'cannotSuspendSelf',
  CANNOT_SUSPEND_ADMIN: 'cannotSuspendAdmin',
  SAME_ORIGIN: 'sameOrigin',
  CANNOT_JOIN_OWN: 'cannotJoinOwn',
  NOT_ALLOWED: 'notAllowed',
  SLUG_TAKEN: 'slugTaken',
  COMMUNITY_ARCHIVED: 'communityArchived',
  NETWORK: 'network',
}

export function errorMessage(
  code: string,
  errors: Record<string, string>,
  fallback: string,
): string {
  const key = ERROR_KEYS[code]
  return (key ? errors[key] : undefined) ?? fallback
}
