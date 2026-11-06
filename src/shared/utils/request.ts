import { AppError } from '@/shared/errors/app-error'

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function assertObjectId(
  value: string,
  code:
    | 'NOT_FOUND'
    | 'COMMUNITY_NOT_FOUND'
    | 'POST_NOT_FOUND'
    | 'USER_NOT_FOUND'
    | 'REPORT_NOT_FOUND' = 'NOT_FOUND',
): void {
  if (!/^[a-f\d]{24}$/i.test(value)) throw new AppError(code)
}
