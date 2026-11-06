import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { SESSION_ISSUER, SESSION_TTL_SECONDS, type PlatformRole } from '@/shared/constants'
import { DEV_SESSION_SECRET } from '@/shared/env'

/**
 * Edge-safe session token primitives.
 * This module must not import `next/headers`, Mongoose or any Node-only API so that it can be
 * used from `src/proxy.ts` (edge runtime) as well as from Node route handlers.
 */

export interface SessionClaims {
  userId: string
  role: PlatformRole
  sessionVersion: number
  sessionId: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret)
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production')
  }
  return new TextEncoder().encode(DEV_SESSION_SECRET)
}

export async function createSessionToken(
  claims: SessionClaims,
  expiresInSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)
  return new SignJWT({
    role: claims.role,
    ver: claims.sessionVersion,
    sid: claims.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + expiresInSeconds)
    .sign(getSecretKey())
}

function toClaims(payload: JWTPayload): SessionClaims | null {
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string' ||
    typeof payload.ver !== 'number' ||
    typeof payload.sid !== 'string'
  ) {
    return null
  }
  if (!['learner', 'educator', 'admin'].includes(payload.role)) return null
  return {
    userId: payload.sub,
    role: payload.role as PlatformRole,
    sessionVersion: payload.ver,
    sessionId: payload.sid,
  }
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionClaims | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: SESSION_ISSUER,
      algorithms: ['HS256'],
    })
    return toClaims(payload)
  } catch {
    return null
  }
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
