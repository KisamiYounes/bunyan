export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'WEAK_PASSWORD',
  'MINOR_NOT_ALLOWED',
  'GUARDIAN_REQUIRED',
  'COMMUNITY_NOT_FOUND',
  'COMMUNITY_PRIVATE',
  'NOT_MEMBER',
  'ALREADY_MEMBER',
  'POST_NOT_FOUND',
  'ACCOUNT_SUSPENDED',
  'REPORT_NOT_FOUND',
  'USER_NOT_FOUND',
  'CANNOT_SUSPEND_SELF',
  'CANNOT_SUSPEND_ADMIN',
  'SAME_ORIGIN',
  'CANNOT_JOIN_OWN',
  'NOT_ALLOWED',
  'SLUG_TAKEN',
  'COMMUNITY_ARCHIVED',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INVALID_CREDENTIALS: 401,
  EMAIL_TAKEN: 409,
  USERNAME_TAKEN: 409,
  WEAK_PASSWORD: 422,
  MINOR_NOT_ALLOWED: 403,
  GUARDIAN_REQUIRED: 403,
  COMMUNITY_NOT_FOUND: 404,
  COMMUNITY_PRIVATE: 403,
  NOT_MEMBER: 403,
  ALREADY_MEMBER: 409,
  POST_NOT_FOUND: 404,
  ACCOUNT_SUSPENDED: 403,
  REPORT_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  CANNOT_SUSPEND_SELF: 400,
  CANNOT_SUSPEND_ADMIN: 403,
  SAME_ORIGIN: 403,
  CANNOT_JOIN_OWN: 400,
  NOT_ALLOWED: 403,
  SLUG_TAKEN: 409,
  COMMUNITY_ARCHIVED: 403,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown
  readonly retryAfterSeconds?: number

  constructor(
    code: ErrorCode,
    message?: string,
    options?: { details?: unknown; retryAfterSeconds?: number },
  ) {
    super(message ?? code)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = options?.details
    this.retryAfterSeconds = options?.retryAfterSeconds
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

export const errors = {
  validation: (details?: unknown) => new AppError('VALIDATION_ERROR', undefined, { details }),
  unauthorized: () => new AppError('UNAUTHORIZED'),
  forbidden: (message?: string) => new AppError('FORBIDDEN', message),
  notFound: (
    code:
      | 'NOT_FOUND'
      | 'COMMUNITY_NOT_FOUND'
      | 'POST_NOT_FOUND'
      | 'USER_NOT_FOUND'
      | 'REPORT_NOT_FOUND' = 'NOT_FOUND',
  ) => new AppError(code),
  rateLimited: (retryAfterSeconds: number) =>
    new AppError('RATE_LIMITED', undefined, { retryAfterSeconds }),
  internal: () => new AppError('INTERNAL_ERROR'),
}
