import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, isAppError } from './app-error'
import { logger } from '@/infrastructure/logging/logger'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    )
  }

  if (isAppError(error)) {
    const headers: Record<string, string> = {}
    if (error.retryAfterSeconds !== undefined) {
      headers['Retry-After'] = String(error.retryAfterSeconds)
    }
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status, headers },
    )
  }

  logger.error('Unhandled API error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    { status: 500 },
  )
}

export async function handleApi(
  handler: () => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (error) {
    return errorResponse(error)
  }
}

/**
 * Defense in depth against CSRF on top of SameSite=Lax cookies.
 * Rejects cross-site mutations where an Origin header is present and does not match the Host.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  if (!origin) return

  const host = request.headers.get('host')
  if (!host) throw new AppError('SAME_ORIGIN')

  try {
    const originUrl = new URL(origin)
    if (originUrl.host !== host) throw new AppError('SAME_ORIGIN')
  } catch {
    throw new AppError('SAME_ORIGIN')
  }
}

export function json<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Request body must be valid JSON')
  }
}

export async function enforceRateLimit(
  key: string,
  config: { limit: number; windowMs: number },
): Promise<void> {
  const { rateLimit } = await import('@/infrastructure/rate-limit')
  const result = await rateLimit(key, config.limit, config.windowMs)
  if (!result.allowed) {
    throw new AppError('RATE_LIMITED', undefined, {
      retryAfterSeconds: result.retryAfterSeconds,
    })
  }
}
