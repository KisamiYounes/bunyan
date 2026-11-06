import { compare, hash } from 'bcryptjs'
import { ADULT_AGE, MIN_SELF_REGISTRATION_AGE, type AgeBand } from '@/shared/constants'
import type { UserRecord } from './user.model'

export const BCRYPT_COST = 12
export const DUMMY_PASSWORD_HASH = '$2b$12$8ktc9BN8DU418wSB2fXlR.52PellXGx3hVJ0dASOr1S5MUcZX.Qp6'

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '1234567890',
  'qwertyuiop',
  'iloveyou',
  'admin12345',
  'welcome123',
  'letmein123',
  'changeme123',
  'bunyan1234',
])

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash)
}

export function passwordIssue(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters'
  if (password.length > 128) return 'Password must be at most 128 characters'
  const normalized = password.toLowerCase()
  if (COMMON_PASSWORDS.has(normalized)) return 'Password is too common'
  if (/^(.)\1+$/.test(password)) return 'Password is too repetitive'
  return null
}

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getUTCFullYear() - birthYear
}

export function ageBandFromBirthYear(birthYear?: number, now: Date = new Date()): AgeBand {
  if (!birthYear) return 'unknown'
  const age = ageFromBirthYear(birthYear, now)
  if (age < MIN_SELF_REGISTRATION_AGE) return 'child'
  if (age < ADULT_AGE) return 'teen'
  return 'adult'
}

type SafeguardingSubject = {
  ageBand: AgeBand
  guardianConsentAt?: Date | string | null
  status: string
}

export function canParticipateSocially(user: SafeguardingSubject): boolean {
  if (user.status !== 'active') return false
  if (user.ageBand === 'child') return false
  if (user.ageBand === 'teen') return Boolean(user.guardianConsentAt)
  return true
}

export function canCreateCommunity(user: SafeguardingSubject & Pick<UserRecord, 'role'>): boolean {
  if (user.role === 'admin' || user.role === 'educator') {
    return canParticipateSocially(user)
  }
  if (user.ageBand === 'teen' || user.ageBand === 'child') return false
  return canParticipateSocially(user)
}

export function canModerateCommunity(role: string): boolean {
  return role === 'owner' || role === 'moderator'
}
