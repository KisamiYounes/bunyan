import { describe, expect, it } from 'vitest'
import type { SessionUser } from '@/modules/identity/dto'
import {
  assertCanCreateCommunity,
  assertCanParticipate,
  isAdmin,
  requireAdmin,
} from '@/modules/identity/authorization'

function session(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: '507f1f77bcf86cd799439011',
    email: 'user@test.local',
    username: 'user',
    name: 'Test User',
    role: 'learner',
    status: 'active',
    locale: 'ar',
    bio: '',
    ageBand: 'adult',
    xp: 0,
    level: 1,
    profileVisibility: 'public',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('authorization guards', () => {
  it('allows active adults to participate', () => {
    expect(() => assertCanParticipate(session())).not.toThrow()
  })

  it('rejects suspended accounts with ACCOUNT_SUSPENDED', () => {
    expect(() => assertCanParticipate(session({ status: 'suspended' }))).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_SUSPENDED' }),
    )
  })

  it('requires guardian consent for teens', () => {
    expect(() => assertCanParticipate(session({ ageBand: 'teen' }))).toThrow(
      expect.objectContaining({ code: 'GUARDIAN_REQUIRED' }),
    )
    expect(() =>
      assertCanParticipate(
        session({ ageBand: 'teen', guardianConsentAt: new Date().toISOString() }),
      ),
    ).not.toThrow()
  })

  it('blocks minors from creating communities', () => {
    expect(() => assertCanCreateCommunity(session({ ageBand: 'teen' }))).toThrow(
      expect.objectContaining({ code: 'NOT_ALLOWED' }),
    )
    expect(() => assertCanCreateCommunity(session())).not.toThrow()
  })

  it('recognises only active platform administrators', () => {
    expect(isAdmin(session({ role: 'admin' }))).toBe(true)
    expect(isAdmin(session({ role: 'admin', status: 'suspended' }))).toBe(false)
    expect(isAdmin(session())).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })

  it('requires an active admin for admin-only actions', () => {
    expect(() => requireAdmin(session({ role: 'admin' }))).not.toThrow()
    expect(() => requireAdmin(session())).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
    expect(() => requireAdmin(session({ role: 'admin', status: 'suspended' }))).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    )
  })
})
