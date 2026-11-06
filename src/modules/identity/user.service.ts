import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import { UserModel, type UserDocument } from './user.model'
import { toSessionUser, toPublicUser, type PublicUser, type SessionUser } from './dto'
import type { UpdateProfileInput } from './validation'
import { isDuplicateKeyError } from './auth.service'
import { levelForXp } from '@/shared/utils/level'
import { escapeRegExp } from '@/shared/utils/pagination'

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<SessionUser> {
  await connectToDatabase()

  const conflict = await UserModel.findOne({
    username: input.username,
    _id: { $ne: userId },
  })
    .select('_id')
    .lean<{ _id: unknown } | null>()
  if (conflict) throw new AppError('USERNAME_TAKEN')

  try {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        name: input.name,
        username: input.username,
        bio: input.bio ?? '',
        avatarUrl: input.avatarUrl,
        locale: input.locale,
        profileVisibility: input.profileVisibility,
      },
      { returnDocument: 'after', runValidators: true },
    )
    if (!user) throw new AppError('UNAUTHORIZED')
    return toSessionUser(user)
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError('USERNAME_TAKEN')
    throw error
  }
}

export interface ProfileLookup {
  user: PublicUser
  isPrivate: boolean
}

/**
 * Profile visibility is evaluated server-side. "members" profiles are only visible to the
 * account owner and platform administrators; other viewers receive a privacy-limited shell.
 */
export async function getProfileForViewer(
  username: string,
  viewer: SessionUser | null,
): Promise<ProfileLookup | null> {
  await connectToDatabase()
  const user = await UserModel.findOne({
    username: username.toLowerCase(),
    status: 'active',
  }).lean<UserDocument | null>()
  if (!user) return null

  const isOwner = viewer?.id === String(user._id)
  const isPrivate = user.profileVisibility === 'members' && !isOwner && viewer?.role !== 'admin'

  return { user: toPublicUser(user), isPrivate }
}

export async function getPublicProfile(username: string): Promise<PublicUser | null> {
  await connectToDatabase()
  const user = await UserModel.findOne({
    username: username.toLowerCase(),
    status: 'active',
  }).lean<UserDocument | null>()
  if (!user) return null
  if (user.profileVisibility === 'members') return null
  return toPublicUser(user)
}

export async function getUserById(userId: string): Promise<SessionUser | null> {
  await connectToDatabase()
  const user = await UserModel.findById(userId).lean<UserDocument | null>()
  if (!user || user.status !== 'active') return null
  return toSessionUser(user)
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  if (ids.length === 0) return new Map()
  await connectToDatabase()
  const users = await UserModel.find({ _id: { $in: ids } }).lean<UserDocument[]>()
  return new Map(users.map((user) => [String(user._id), toPublicUser(user)]))
}

/**
 * Applies experience points atomically and recomputes the persisted level.
 * Called only by the gamification module after it has recorded a unique XP event.
 */
export async function applyExperience(
  userId: string,
  points: number,
): Promise<{ xp: number; level: number }> {
  await connectToDatabase()
  const current = await UserModel.findById(userId).select('xp').lean<{ xp: number } | null>()
  if (!current) return { xp: 0, level: 1 }
  const xp = Math.max(0, current.xp + points)
  const level = levelForXp(xp)
  await UserModel.updateOne({ _id: userId }, { $set: { xp, level } })
  return { xp, level }
}

export interface AdminUserListResult {
  items: SessionUser[]
  total: number
  page: number
  limit: number
}

export async function listUsersForAdmin(params: {
  page?: number
  limit?: number
  search?: string
}): Promise<AdminUserListResult> {
  await connectToDatabase()
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? 20))
  const filter: Record<string, unknown> = { status: { $ne: 'deleted' } }
  if (params.search?.trim()) {
    const pattern = new RegExp(escapeRegExp(params.search.trim()), 'i')
    filter.$or = [{ name: pattern }, { email: pattern }, { username: pattern }]
  }

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<UserDocument[]>(),
    UserModel.countDocuments(filter),
  ])
  return { items: users.map(toSessionUser), total, page, limit }
}

export async function setUserAccountStatus(
  actorId: string,
  userId: string,
  status: 'active' | 'suspended',
): Promise<void> {
  await connectToDatabase()
  if (actorId === userId) throw new AppError('CANNOT_SUSPEND_SELF')

  const target = await UserModel.findById(userId)
    .select('role status')
    .lean<{ role: string; status: string } | null>()
  if (!target) throw new AppError('USER_NOT_FOUND')
  if (target.role === 'admin' && status === 'suspended') throw new AppError('CANNOT_SUSPEND_ADMIN')

  await UserModel.updateOne(
    { _id: userId },
    status === 'suspended'
      ? { $set: { status }, $inc: { sessionVersion: 1 } }
      : { $set: { status } },
  )
}

export async function countUsers(): Promise<number> {
  await connectToDatabase()
  return UserModel.countDocuments({ status: { $ne: 'deleted' } })
}

export async function getRankedLearners(limit = 10, excludeMinors = true): Promise<PublicUser[]> {
  await connectToDatabase()
  const filter: Record<string, unknown> = { status: 'active', profileVisibility: 'public' }
  if (excludeMinors) filter.ageBand = { $nin: ['teen', 'child'] }
  const users = await UserModel.find(filter)
    .sort({ xp: -1 })
    .limit(Math.min(limit, 50))
    .lean<UserDocument[]>()
  return users.map(toPublicUser)
}
