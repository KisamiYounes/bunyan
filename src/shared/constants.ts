export const SESSION_COOKIE = 'bunyan_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
export const SESSION_ISSUER = 'bunyan'

export const PLATFORM_ROLES = ['learner', 'educator', 'admin'] as const
export type PlatformRole = (typeof PLATFORM_ROLES)[number]

export const ACCOUNT_STATUSES = ['active', 'suspended', 'deleted'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const AGE_BANDS = ['child', 'teen', 'adult', 'unknown'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export const COMMUNITY_VISIBILITIES = ['public', 'private'] as const
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number]

export const COMMUNITY_ROLES = ['owner', 'moderator', 'member'] as const
export type CommunityRole = (typeof COMMUNITY_ROLES)[number]

export const MEMBERSHIP_STATUSES = ['active', 'pending', 'banned', 'left'] as const
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number]

export const COMMUNITY_STATUSES = ['active', 'archived', 'suspended'] as const
export type CommunityStatus = (typeof COMMUNITY_STATUSES)[number]

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed', 'escalated'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'misinformation',
  'minorSafety',
  'other',
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_TARGET_TYPES = ['post', 'comment', 'community', 'user'] as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

export const TOPICS = [
  'programming',
  'mathematics',
  'sciences',
  'medicine',
  'law',
  'economics',
  'engineering',
  'languages',
  'history',
  'arts',
  'professional',
  'personal',
] as const
export type Topic = (typeof TOPICS)[number]

export const MIN_SELF_REGISTRATION_AGE = 13
export const ADULT_AGE = 18

export const XP_POINTS = {
  post_created: 5,
  comment_created: 2,
  lesson_completed: 10,
  assessment_passed: 25,
  project_reviewed: 15,
} as const

export type XpKind = keyof typeof XP_POINTS

export const LEVEL_STEP = 50
export const MAX_LEVEL = 99

export const PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 50
export const MAX_POST_LENGTH = 10_000
export const MAX_COMMENT_LENGTH = 3_000
export const MAX_BIO_LENGTH = 600
export const MAX_COMMUNITY_DESCRIPTION = 1_000

export const RATE_LIMITS = {
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  loginIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  loginAccount: { limit: 5, windowMs: 15 * 60 * 1000 },
  post: { limit: 10, windowMs: 10 * 60 * 1000 },
  comment: { limit: 20, windowMs: 10 * 60 * 1000 },
  report: { limit: 10, windowMs: 60 * 60 * 1000 },
  membership: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const
