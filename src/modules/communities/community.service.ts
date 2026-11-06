import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import {
  PAGE_SIZE,
  type CommunityRole,
  type MembershipStatus,
  type Topic,
} from '@/shared/constants'
import { escapeRegExp } from '@/shared/utils/pagination'
import type { SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { assertCanCreateCommunity, assertCanParticipate } from '@/modules/identity/authorization'
import { CommunityModel, type CommunityRecord } from './community.model'
import { MembershipModel, type MembershipRecord } from './membership.model'
import { PostModel } from './post.model'
import { CommentModel } from './comment.model'
import type { CreateCommunityInput } from './validation'
import type { PublicUser } from '@/modules/identity/dto'

export interface CommunityView {
  id: string
  name: string
  slug: string
  description: string
  visibility: 'public' | 'private'
  topic?: Topic
  language: string
  memberCount: number
  postCount: number
  rules?: string
  status: 'active' | 'archived' | 'suspended'
  ownerId: string
  createdAt: string
}

export interface MembershipSummary {
  id: string
  role: CommunityRole
  status: MembershipStatus
  joinedAt?: string
}

export interface CommunityAccess {
  community: CommunityView
  membership: MembershipSummary | null
  canView: boolean
  canPost: boolean
  isAdmin: boolean
  isModerator: boolean
  isOwner: boolean
}

export interface CommunityListResult {
  items: CommunityView[]
  total: number
  page: number
  limit: number
}

export function toCommunityView(community: CommunityRecord): CommunityView {
  return {
    id: String(community._id),
    name: community.name,
    slug: community.slug,
    description: community.description,
    visibility: community.visibility,
    topic: community.topic,
    language: community.language,
    memberCount: community.memberCount,
    postCount: community.postCount,
    rules: community.rules,
    status: community.status,
    ownerId: String(community.ownerId),
    createdAt: community.createdAt.toISOString(),
  }
}

function toMembershipSummary(membership: MembershipRecord | null): MembershipSummary | null {
  if (!membership) return null
  return {
    id: String(membership._id),
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt?.toISOString(),
  }
}

export async function listCommunities(params: {
  page?: number
  limit?: number
  topic?: Topic
  search?: string
  viewerId?: string
  onlyMine?: boolean
}): Promise<CommunityListResult> {
  await connectToDatabase()
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? PAGE_SIZE))
  const filter: Record<string, unknown> = { status: { $in: ['active', 'archived'] } }

  if (params.topic) filter.topic = params.topic
  if (params.search?.trim()) {
    const pattern = new RegExp(escapeRegExp(params.search.trim()), 'i')
    filter.$or = [{ name: pattern }, { description: pattern }]
  }

  if (params.onlyMine) {
    if (!params.viewerId) return { items: [], total: 0, page, limit }
    const memberships = await MembershipModel.find({
      userId: params.viewerId,
      status: 'active',
    })
      .select('communityId')
      .lean<Array<{ communityId: unknown }>>()
    filter._id = { $in: memberships.map((membership) => membership.communityId) }
    delete filter.status
  }

  const [items, total] = await Promise.all([
    CommunityModel.find(filter)
      .sort({ memberCount: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<CommunityRecord[]>(),
    CommunityModel.countDocuments(filter),
  ])

  return { items: items.map(toCommunityView), total, page, limit }
}

export async function getCommunityAccess(
  communityId: string,
  viewer: SessionUser | null,
): Promise<CommunityAccess | null> {
  await connectToDatabase()
  const community = await CommunityModel.findById(communityId).lean<CommunityRecord | null>()
  if (!community) return null

  const membership = viewer
    ? await MembershipModel.findOne({
        communityId,
        userId: viewer.id,
      }).lean<MembershipRecord | null>()
    : null

  const isAdmin = viewer?.role === 'admin'
  const isOwner = membership?.role === 'owner' && membership.status === 'active'
  const isModerator =
    Boolean(membership) &&
    membership?.status === 'active' &&
    (membership?.role === 'moderator' || membership?.role === 'owner')
  const canView =
    community.visibility === 'public' || membership?.status === 'active' || Boolean(isAdmin)
  const canPost =
    community.status === 'active' &&
    membership?.status === 'active' &&
    (viewer ? canParticipate(viewer) : false)

  return {
    community: toCommunityView(community),
    membership: toMembershipSummary(membership),
    canView,
    canPost,
    isAdmin: Boolean(isAdmin),
    isModerator,
    isOwner,
  }
}

export async function getCommunityAccessBySlug(
  slug: string,
  viewer: SessionUser | null,
): Promise<CommunityAccess> {
  await connectToDatabase()
  const community = await CommunityModel.findOne({ slug: slug.toLowerCase() })
    .select('_id')
    .lean<{ _id: unknown } | null>()
  if (!community) throw new AppError('COMMUNITY_NOT_FOUND')
  const access = await getCommunityAccess(String(community._id), viewer)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  return access
}

function canParticipate(user: SessionUser): boolean {
  try {
    assertCanParticipate(user)
    return true
  } catch {
    return false
  }
}

export async function createCommunity(
  user: SessionUser,
  input: CreateCommunityInput,
): Promise<CommunityView> {
  assertCanCreateCommunity(user)
  await connectToDatabase()

  const existing = await CommunityModel.findOne({ slug: input.slug }).select('_id').lean()
  if (existing) throw new AppError('SLUG_TAKEN')

  const community = await CommunityModel.create({
    name: input.name,
    slug: input.slug,
    description: input.description,
    visibility: input.visibility,
    topic: input.topic,
    language: input.language,
    rules: input.rules,
    ownerId: user.id,
    memberCount: 1,
    postCount: 0,
    status: 'active',
  })

  try {
    await MembershipModel.create({
      communityId: community._id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    })
  } catch (error) {
    await CommunityModel.deleteOne({ _id: community._id })
    throw error
  }

  return toCommunityView(community)
}

export async function joinCommunity(
  user: SessionUser,
  communityId: string,
): Promise<{ status: 'active' | 'pending' }> {
  assertCanParticipate(user)
  await connectToDatabase()

  const community = await CommunityModel.findById(communityId).lean<CommunityRecord | null>()
  if (!community) throw new AppError('COMMUNITY_NOT_FOUND')
  if (community.status !== 'active') throw new AppError('COMMUNITY_ARCHIVED')

  const existing = await MembershipModel.findOne({
    communityId,
    userId: user.id,
  }).lean<MembershipRecord | null>()

  if (existing?.role === 'owner') throw new AppError('CANNOT_JOIN_OWN')
  if (existing?.status === 'active') throw new AppError('ALREADY_MEMBER')
  if (existing?.status === 'banned') throw new AppError('NOT_ALLOWED')
  if (existing?.status === 'pending') return { status: 'pending' }

  const nextStatus = community.visibility === 'public' ? 'active' : 'pending'

  if (existing) {
    await MembershipModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: nextStatus,
          role: 'member',
          joinedAt: nextStatus === 'active' ? new Date() : undefined,
        },
      },
    )
  } else {
    await MembershipModel.create({
      communityId,
      userId: user.id,
      role: 'member',
      status: nextStatus,
      joinedAt: nextStatus === 'active' ? new Date() : undefined,
    })
  }

  if (nextStatus === 'active') {
    await CommunityModel.updateOne({ _id: communityId }, { $inc: { memberCount: 1 } })
  }

  return { status: nextStatus }
}

export async function leaveCommunity(user: SessionUser, communityId: string): Promise<void> {
  await connectToDatabase()
  const membership = await MembershipModel.findOne({
    communityId,
    userId: user.id,
  }).lean<MembershipRecord | null>()
  if (!membership) throw new AppError('NOT_MEMBER')
  if (membership.role === 'owner') {
    throw new AppError('NOT_ALLOWED', 'Owners cannot leave their own community in this phase')
  }
  if (membership.status === 'left') return

  const wasActive = membership.status === 'active'
  await MembershipModel.updateOne(
    { _id: membership._id },
    { $set: { status: 'left', joinedAt: undefined } },
  )
  if (wasActive) {
    await CommunityModel.updateOne(
      { _id: communityId, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } },
    )
  }
}

export async function getMemberRole(
  communityId: string,
  userId: string,
): Promise<CommunityRole | null> {
  await connectToDatabase()
  const membership = await MembershipModel.findOne({ communityId, userId, status: 'active' })
    .select('role')
    .lean<{ role: CommunityRole } | null>()
  return membership?.role ?? null
}

export async function approveMembership(
  actor: SessionUser,
  membershipId: string,
  decision: 'approve' | 'reject',
): Promise<void> {
  await connectToDatabase()
  const membership = await MembershipModel.findById(membershipId).lean<MembershipRecord | null>()
  if (!membership) throw new AppError('NOT_FOUND')
  await assertModerator(actor, String(membership.communityId))

  if (membership.status !== 'pending')
    throw new AppError('VALIDATION_ERROR', 'Membership is not pending')
  if (membership.role === 'owner') throw new AppError('NOT_ALLOWED')

  if (decision === 'approve') {
    await MembershipModel.updateOne(
      { _id: membership._id, status: 'pending' },
      { $set: { status: 'active', joinedAt: new Date() } },
    )
    await CommunityModel.updateOne({ _id: membership.communityId }, { $inc: { memberCount: 1 } })
  } else {
    await MembershipModel.updateOne({ _id: membership._id }, { $set: { status: 'banned' } })
  }
}

export async function setMemberRole(
  actor: SessionUser,
  membershipId: string,
  role: 'moderator' | 'member',
): Promise<void> {
  await connectToDatabase()
  const membership = await MembershipModel.findById(membershipId).lean<MembershipRecord | null>()
  if (!membership) throw new AppError('NOT_FOUND')

  const access = await getCommunityAccess(String(membership.communityId), actor)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.isOwner && !access.isAdmin) throw new AppError('FORBIDDEN')

  if (membership.role === 'owner') throw new AppError('NOT_ALLOWED')
  if (membership.userId.toString() === actor.id) throw new AppError('NOT_ALLOWED')

  if (role === 'moderator') {
    const users = await getUsersByIds([membership.userId.toString()])
    const target = users.get(membership.userId.toString())
    if (target && (target.ageBand === 'teen' || target.ageBand === 'child')) {
      throw new AppError('NOT_ALLOWED', 'Minors cannot hold moderation roles')
    }
  }

  await MembershipModel.updateOne({ _id: membership._id }, { $set: { role } })
}

export async function banMember(actor: SessionUser, membershipId: string): Promise<void> {
  await connectToDatabase()
  const membership = await MembershipModel.findById(membershipId).lean<MembershipRecord | null>()
  if (!membership) throw new AppError('NOT_FOUND')
  await assertModerator(actor, String(membership.communityId))

  if (membership.role === 'owner') throw new AppError('NOT_ALLOWED')
  if (membership.userId.toString() === actor.id) throw new AppError('NOT_ALLOWED')

  const wasActive = membership.status === 'active'
  await MembershipModel.updateOne({ _id: membership._id }, { $set: { status: 'banned' } })
  if (wasActive) {
    await CommunityModel.updateOne(
      { _id: membership.communityId, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } },
    )
  }
}

export async function archiveCommunity(actor: SessionUser, communityId: string): Promise<void> {
  await connectToDatabase()
  const access = await getCommunityAccess(communityId, actor)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.isOwner && !access.isAdmin) throw new AppError('FORBIDDEN')

  await CommunityModel.updateOne({ _id: communityId }, { $set: { status: 'archived' } })
}

async function assertModerator(actor: SessionUser, communityId: string): Promise<void> {
  if (actor.role === 'admin') return
  const role = await getMemberRole(communityId, actor.id)
  if (role !== 'owner' && role !== 'moderator') throw new AppError('FORBIDDEN')
}

export interface MemberView {
  membershipId: string
  role: CommunityRole
  status: MembershipStatus
  joinedAt?: string
  user: PublicUser | null
}

export async function getCommunityMembers(
  communityId: string,
  actor: SessionUser | null,
): Promise<MemberView[]> {
  const access = await getCommunityAccess(communityId, actor)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')

  await connectToDatabase()
  const memberships = await MembershipModel.find({ communityId, status: 'active' })
    .sort({ role: 1, joinedAt: 1 })
    .limit(200)
    .lean<MembershipRecord[]>()

  const users = await getUsersByIds(memberships.map((membership) => membership.userId.toString()))
  const roleOrder: Record<CommunityRole, number> = { owner: 0, moderator: 1, member: 2 }
  return memberships
    .map((membership) => ({
      membershipId: String(membership._id),
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt?.toISOString(),
      user: users.get(membership.userId.toString()) ?? null,
    }))
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
}

export async function getPendingMemberships(
  communityId: string,
  actor: SessionUser,
): Promise<MemberView[]> {
  await assertModerator(actor, communityId)
  await connectToDatabase()
  const memberships = await MembershipModel.find({ communityId, status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean<MembershipRecord[]>()
  const users = await getUsersByIds(memberships.map((membership) => membership.userId.toString()))
  return memberships.map((membership) => ({
    membershipId: String(membership._id),
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt?.toISOString(),
    user: users.get(membership.userId.toString()) ?? null,
  }))
}

export interface UserCommunityView {
  community: CommunityView
  role: CommunityRole
  status: MembershipStatus
}

export async function getUserCommunities(userId: string): Promise<UserCommunityView[]> {
  await connectToDatabase()
  const memberships = await MembershipModel.find({
    userId,
    status: { $in: ['active', 'pending'] },
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean<MembershipRecord[]>()
  if (memberships.length === 0) return []

  const communities = await CommunityModel.find({
    _id: { $in: memberships.map((membership) => membership.communityId) },
  }).lean<CommunityRecord[]>()
  const byId = new Map(communities.map((community) => [String(community._id), community]))

  return memberships.flatMap((membership) => {
    const community = byId.get(membership.communityId.toString())
    if (!community) return []
    return [
      {
        community: toCommunityView(community),
        role: membership.role,
        status: membership.status,
      },
    ]
  })
}

export interface ContributionStats {
  posts: number
  comments: number
  communities: number
}

export async function getUserContributionStats(userId: string): Promise<ContributionStats> {
  await connectToDatabase()
  const [posts, comments, communities] = await Promise.all([
    PostModel.countDocuments({ authorId: userId, status: 'published' }),
    CommentModel.countDocuments({ authorId: userId, status: 'published' }),
    MembershipModel.countDocuments({ userId, status: 'active' }),
  ])
  return { posts, comments, communities }
}

export interface AdminCommunityView extends CommunityView {
  ownerName?: string
}

export interface AdminCommunityListResult {
  items: AdminCommunityView[]
  total: number
  page: number
  limit: number
}

export async function listCommunitiesForAdmin(params: {
  page?: number
  limit?: number
  search?: string
}): Promise<AdminCommunityListResult> {
  await connectToDatabase()
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? 20))
  const filter: Record<string, unknown> = {}
  if (params.search?.trim()) {
    const pattern = new RegExp(escapeRegExp(params.search.trim()), 'i')
    filter.$or = [{ name: pattern }, { slug: pattern }, { description: pattern }]
  }

  const [communities, total] = await Promise.all([
    CommunityModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<CommunityRecord[]>(),
    CommunityModel.countDocuments(filter),
  ])

  const owners = await getUsersByIds(communities.map((community) => community.ownerId.toString()))
  return {
    items: communities.map((community) => ({
      ...toCommunityView(community),
      ownerName: owners.get(community.ownerId.toString())?.name,
    })),
    total,
    page,
    limit,
  }
}

export async function adminSetCommunityStatus(
  communityId: string,
  status: 'active' | 'archived' | 'suspended',
): Promise<void> {
  await connectToDatabase()
  const result = await CommunityModel.updateOne({ _id: communityId }, { $set: { status } })
  if (result.matchedCount === 0) throw new AppError('COMMUNITY_NOT_FOUND')
}

export async function countCommunities(): Promise<number> {
  await connectToDatabase()
  return CommunityModel.countDocuments({})
}

export async function countAllPosts(): Promise<number> {
  await connectToDatabase()
  return PostModel.countDocuments({ status: 'published' })
}

export async function getCommunityStats(communityId: string): Promise<ContributionStats> {
  await connectToDatabase()
  const [posts, comments, communities] = await Promise.all([
    PostModel.countDocuments({ communityId, status: 'published' }),
    CommentModel.countDocuments({ communityId, status: 'published' }),
    MembershipModel.countDocuments({ communityId, status: 'active' }),
  ])
  return { posts, comments, communities }
}
