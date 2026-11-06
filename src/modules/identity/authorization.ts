import type { SessionUser } from './dto'
import { canCreateCommunity, canParticipateSocially } from './password'
import { AppError } from '@/shared/errors/app-error'

export function requireAdmin(user: SessionUser): void {
  if (user.role !== 'admin' || user.status !== 'active') {
    throw new AppError('FORBIDDEN')
  }
}

export function assertCanParticipate(user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (!canParticipateSocially(user)) {
    if (user.ageBand === 'teen') throw new AppError('GUARDIAN_REQUIRED')
    throw new AppError('NOT_ALLOWED')
  }
}

export function assertCanCreateCommunity(user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (!canCreateCommunity(user)) {
    if (user.ageBand === 'teen' || user.ageBand === 'child') {
      throw new AppError('NOT_ALLOWED', 'Minors cannot create communities in this phase')
    }
    throw new AppError('NOT_ALLOWED')
  }
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return Boolean(user && user.role === 'admin' && user.status === 'active')
}

/** Learning content authoring mirrors the server rule: active adult educator or admin. */
export function canAuthorLearning(user: SessionUser | null | undefined): boolean {
  return Boolean(
    user &&
    user.status === 'active' &&
    user.ageBand === 'adult' &&
    (user.role === 'educator' || user.role === 'admin'),
  )
}
