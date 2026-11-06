import { cookies } from 'next/headers'
import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import { SESSION_COOKIE } from '@/shared/constants'
import { SESSION_TTL_SECONDS } from '@/shared/constants'
import type { UserDocument } from './user.model'
import { UserModel } from './user.model'
import { newSessionId, createSessionToken, verifySessionToken } from './session-token'
import { toSessionUser, type SessionUser } from './dto'

/**
 * Server-only session helpers. Importing this module from `src/proxy.ts` is forbidden:
 * `next/headers` is not available in the edge proxy runtime. Use `session-token.ts` there.
 */

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const claims = await verifySessionToken(token)
  if (!claims) return null

  await connectToDatabase()
  const user = await UserModel.findById(claims.userId).lean<UserDocument | null>()
  if (!user) return null
  if (user.status !== 'active') return null
  if (user.sessionVersion !== claims.sessionVersion) return null

  return toSessionUser(user)
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new AppError('UNAUTHORIZED')
  return user
}

export async function establishSession(user: UserDocument): Promise<void> {
  const token = await createSessionToken({
    userId: String(user._id),
    role: user.role,
    sessionVersion: user.sessionVersion,
    sessionId: newSessionId(),
  })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await connectToDatabase()
  await UserModel.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } })
}
