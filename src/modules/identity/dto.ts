import type { UserDocument, UserRecord } from './user.model'
import type { AgeBand, PlatformRole, AccountStatus } from '@/shared/constants'
import type { Locale } from '@/i18n/config'

export interface SessionUser {
  id: string
  email: string
  username: string
  name: string
  role: PlatformRole
  status: AccountStatus
  locale: Locale
  bio: string
  avatarUrl?: string
  ageBand: AgeBand
  guardianConsentAt?: string
  xp: number
  level: number
  profileVisibility: 'public' | 'members'
  createdAt: string
}

export interface PublicUser {
  id: string
  username: string
  name: string
  role: PlatformRole
  bio: string
  avatarUrl?: string
  ageBand: AgeBand
  xp: number
  level: number
  createdAt: string
}

type MappableUser = Pick<
  UserRecord,
  | '_id'
  | 'email'
  | 'username'
  | 'name'
  | 'role'
  | 'status'
  | 'locale'
  | 'bio'
  | 'avatarUrl'
  | 'ageBand'
  | 'guardianConsentAt'
  | 'xp'
  | 'level'
  | 'profileVisibility'
  | 'createdAt'
>

export function toSessionUser(user: MappableUser): SessionUser {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    locale: user.locale,
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl,
    ageBand: user.ageBand,
    guardianConsentAt: user.guardianConsentAt?.toISOString(),
    xp: user.xp,
    level: user.level,
    profileVisibility: user.profileVisibility,
    createdAt: user.createdAt.toISOString(),
  }
}

export function toPublicUser(user: MappableUser): PublicUser {
  return {
    id: String(user._id),
    username: user.username,
    name: user.name,
    role: user.role,
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl,
    ageBand: user.ageBand,
    xp: user.xp,
    level: user.level,
    createdAt: user.createdAt.toISOString(),
  }
}

export function isMinor(user: Pick<UserRecord, 'ageBand'>): boolean {
  return user.ageBand === 'teen' || user.ageBand === 'child'
}

export type { UserDocument }
