import { describe, expect, it } from 'vitest'
import {
  ageBandFromBirthYear,
  canCreateCommunity,
  canModerateCommunity,
  canParticipateSocially,
  passwordIssue,
  verifyPassword,
  hashPassword,
} from '@/modules/identity/password'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('password policy', () => {
  it('rejects short, common and repetitive passwords', () => {
    expect(passwordIssue('short')).toMatch(/at least 10/)
    expect(passwordIssue('password123')).toMatch(/common/)
    expect(passwordIssue('aaaaaaaaaaaa')).toMatch(/repetitive/)
  })

  it('accepts a strong passphrase', () => {
    expect(passwordIssue('BunyanDemo!2026')).toBeNull()
  })

  it('hashes with bcrypt and verifies without exposing the plain text', async () => {
    const hash = await hashPassword('BunyanDemo!2026')
    expect(hash).not.toContain('BunyanDemo!2026')
    expect(await verifyPassword('BunyanDemo!2026', hash)).toBe(true)
    expect(await verifyPassword('BunyanDemo!2027', hash)).toBe(false)
  })
})

describe('age bands', () => {
  it('classifies children, teens, adults and unknown birth years', () => {
    expect(ageBandFromBirthYear(undefined, NOW)).toBe('unknown')
    expect(ageBandFromBirthYear(2016, NOW)).toBe('child')
    expect(ageBandFromBirthYear(2011, NOW)).toBe('teen')
    expect(ageBandFromBirthYear(1995, NOW)).toBe('adult')
  })
})

describe('safeguarding rules', () => {
  const adult = { status: 'active', ageBand: 'adult' as const, guardianConsentAt: null }

  it('blocks suspended accounts from social participation', () => {
    expect(canParticipateSocially({ ...adult, status: 'suspended' })).toBe(false)
  })

  it('blocks children entirely and teens without guardian consent', () => {
    expect(canParticipateSocially({ ...adult, ageBand: 'child' })).toBe(false)
    expect(canParticipateSocially({ ...adult, ageBand: 'teen' })).toBe(false)
    expect(
      canParticipateSocially({ ...adult, ageBand: 'teen', guardianConsentAt: new Date() }),
    ).toBe(true)
  })

  it('lets adults participate', () => {
    expect(canParticipateSocially(adult)).toBe(true)
  })

  it('forbids minors from creating communities even with consent', () => {
    const teenWithConsent = {
      ...adult,
      ageBand: 'teen' as const,
      guardianConsentAt: new Date(),
      role: 'learner' as const,
    }
    expect(canCreateCommunity(teenWithConsent)).toBe(false)
    expect(canCreateCommunity({ ...adult, role: 'learner' })).toBe(true)
  })

  it('only recognises platform owners and moderators as community moderators', () => {
    expect(canModerateCommunity('owner')).toBe(true)
    expect(canModerateCommunity('moderator')).toBe(true)
    expect(canModerateCommunity('member')).toBe(false)
  })
})
