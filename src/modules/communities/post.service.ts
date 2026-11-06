import type { Types } from 'mongoose'
import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import { assertCanParticipate } from '@/modules/identity/authorization'
import type { PublicUser, SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { awardXp } from '@/modules/gamification/xp.service'
import { CommentModel, type CommentRecord } from './comment.model'
import { PostLikeModel } from './post-like.model'
import { PostModel, type PostRecord } from './post.model'
import { CommunityModel } from './community.model'
import { MembershipModel } from './membership.model'
import { getCommunityAccess } from './community.service'
import type { CreateCommentInput, CreatePostInput } from './validation'

export interface PostView {
  id: string
  communityId: string
  communitySlug: string
  communityName: string
  title?: string
  body: string
  likeCount: number
  commentCount: number
  status: 'published' | 'removed'
  createdAt: string
  author: PublicUser | null
  likedByMe: boolean
  canDelete: boolean
}

export interface CommentView {
  id: string
  body: string
  status: 'published' | 'removed'
  createdAt: string
  author: PublicUser | null
  canDelete: boolean
}

export interface PostListResult {
  items: PostView[]
  total: number
  page: number
  limit: number
}

export async function listCommunityPosts(
  communityId: string,
  viewer: SessionUser | null,
  page = 1,
  limit = 10,
): Promise<PostListResult> {
  const access = await getCommunityAccess(communityId, viewer)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')

  await connectToDatabase()
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(50, Math.max(1, limit))
  const filter = { communityId, status: 'published' as const }

  const [posts, total] = await Promise.all([
    PostModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean<PostRecord[]>(),
    PostModel.countDocuments(filter),
  ])

  return {
    items: await enrichPosts(posts, viewer, access.isModerator || access.isAdmin),
    total,
    page: safePage,
    limit: safeLimit,
  }
}

/**
 * Recent posts for a profile. Posts living in private communities are only listed for viewers
 * who are active members (or platform admins), so profiles cannot leak private discussions.
 */
export async function listUserPosts(
  authorId: string,
  viewer: SessionUser | null,
  limit = 10,
): Promise<PostView[]> {
  await connectToDatabase()
  const posts = await PostModel.find({ authorId, status: 'published' })
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, limit * 3)))
    .lean<PostRecord[]>()
  if (posts.length === 0) return []

  const communityIds = [...new Set(posts.map((post) => post.communityId.toString()))]
  const communities = await CommunityModel.find({ _id: { $in: communityIds } })
    .select('visibility')
    .lean<Array<{ _id: unknown; visibility: 'public' | 'private' }>>()
  const visibility = new Map(
    communities.map((community) => [String(community._id), community.visibility]),
  )

  let memberCommunityIds = new Set<string>()
  if (viewer) {
    const memberships = await MembershipModel.find({
      userId: viewer.id,
      communityId: { $in: communityIds },
      status: 'active',
    })
      .select('communityId')
      .lean<Array<{ communityId: unknown }>>()
    memberCommunityIds = new Set(memberships.map((membership) => String(membership.communityId)))
  }

  const visible = posts
    .filter((post) => {
      const communityId = post.communityId.toString()
      return (
        visibility.get(communityId) === 'public' ||
        viewer?.role === 'admin' ||
        memberCommunityIds.has(communityId)
      )
    })
    .slice(0, Math.min(50, Math.max(1, limit)))

  return enrichPosts(visible, viewer, false)
}

async function enrichPosts(
  posts: PostRecord[],
  viewer: SessionUser | null,
  viewerModerates: boolean,
): Promise<PostView[]> {
  if (posts.length === 0) return []
  const communityIds = [...new Set(posts.map((post) => post.communityId.toString()))]
  const [authors, communities] = await Promise.all([
    getUsersByIds(posts.map((post) => post.authorId.toString())),
    CommunityModel.find({ _id: { $in: communityIds } })
      .select('slug name')
      .lean<Array<{ _id: unknown; slug: string; name: string }>>(),
  ])
  const communityById = new Map(communities.map((community) => [String(community._id), community]))

  let likedIds = new Set<string>()
  if (viewer) {
    const likes = await PostLikeModel.find({
      userId: viewer.id,
      postId: { $in: posts.map((post) => post._id) },
    })
      .select('postId')
      .lean<Array<{ postId: { toString(): string } }>>()
    likedIds = new Set(likes.map((like) => like.postId.toString()))
  }

  return posts.map((post) => {
    const authorId = post.authorId.toString()
    const isAuthor = viewer?.id === authorId
    const community = communityById.get(post.communityId.toString())
    return {
      id: String(post._id),
      communityId: post.communityId.toString(),
      communitySlug: community?.slug ?? '',
      communityName: community?.name ?? '',
      title: post.title,
      body: post.body,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      author: authors.get(authorId) ?? null,
      likedByMe: likedIds.has(String(post._id)),
      canDelete: Boolean(isAuthor || viewerModerates || viewer?.role === 'admin'),
    }
  })
}

export async function getPostForViewer(
  postId: string,
  viewer: SessionUser | null,
): Promise<{
  post: PostView
  access: NonNullable<Awaited<ReturnType<typeof getCommunityAccess>>>
}> {
  await connectToDatabase()
  const post = await PostModel.findById(postId).lean<PostRecord | null>()
  if (!post) throw new AppError('POST_NOT_FOUND')

  const access = await getCommunityAccess(post.communityId.toString(), viewer)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')

  const [view] = await enrichPosts([post], viewer, access.isModerator || access.isAdmin)
  if (!view) throw new AppError('POST_NOT_FOUND')
  return { post: view, access }
}

export async function createPost(
  user: SessionUser,
  communityId: string,
  input: CreatePostInput,
): Promise<string> {
  assertCanParticipate(user)
  const access = await getCommunityAccess(communityId, user)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')
  if (access.community.status !== 'active') throw new AppError('COMMUNITY_ARCHIVED')
  if (access.membership?.status !== 'active') throw new AppError('NOT_MEMBER')

  await connectToDatabase()
  const post = await PostModel.create({
    communityId,
    authorId: user.id,
    title: input.title || undefined,
    body: input.body,
    likeCount: 0,
    commentCount: 0,
    status: 'published',
  })

  await CommunityModel.updateOne({ _id: communityId }, { $inc: { postCount: 1 } })
  await awardXp(user.id, 'post_created', String(post._id))

  return String(post._id)
}

export async function deletePost(user: SessionUser, postId: string): Promise<void> {
  await connectToDatabase()
  const post = await PostModel.findById(postId).lean<PostRecord | null>()
  if (!post) throw new AppError('POST_NOT_FOUND')

  const access = await getCommunityAccess(post.communityId.toString(), user)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')

  const isAuthor = post.authorId.toString() === user.id
  const canModerate = access.isModerator || access.isAdmin || user.role === 'admin'
  if (!isAuthor && !canModerate) throw new AppError('FORBIDDEN')
  if (post.status === 'removed') return

  await PostModel.updateOne({ _id: postId }, { $set: { status: 'removed' } })
  await CommunityModel.updateOne(
    { _id: post.communityId, postCount: { $gt: 0 } },
    { $inc: { postCount: -1 } },
  )
}

export async function toggleLike(
  user: SessionUser,
  postId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  assertCanParticipate(user)
  await connectToDatabase()
  const post = await PostModel.findById(postId).lean<PostRecord | null>()
  if (!post || post.status !== 'published') throw new AppError('POST_NOT_FOUND')

  const access = await getCommunityAccess(post.communityId.toString(), user)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')
  if (access.membership?.status !== 'active') throw new AppError('NOT_MEMBER')

  const existing = await PostLikeModel.findOne({ postId, userId: user.id })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()

  if (existing) {
    await PostLikeModel.deleteOne({ _id: existing._id })
    const updated = await PostModel.findOneAndUpdate(
      { _id: postId, likeCount: { $gt: 0 } },
      { $inc: { likeCount: -1 } },
      { returnDocument: 'after' },
    ).lean<PostRecord | null>()
    return { liked: false, likeCount: updated?.likeCount ?? Math.max(0, post.likeCount - 1) }
  }

  try {
    await PostLikeModel.create({ postId, userId: user.id })
  } catch (error) {
    if (isDuplicate(error)) {
      return { liked: true, likeCount: post.likeCount }
    }
    throw error
  }
  const updated = await PostModel.findByIdAndUpdate(
    postId,
    { $inc: { likeCount: 1 } },
    { returnDocument: 'after' },
  ).lean<PostRecord | null>()
  return { liked: true, likeCount: updated?.likeCount ?? post.likeCount + 1 }
}

export async function listComments(
  postId: string,
  viewer: SessionUser | null,
): Promise<CommentView[]> {
  const { access } = await getPostForViewer(postId, viewer)
  await connectToDatabase()
  const comments = await CommentModel.find({ postId, status: 'published' })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean<CommentRecord[]>()

  const authors = await getUsersByIds(comments.map((comment) => comment.authorId.toString()))
  return comments.map((comment) => {
    const authorId = comment.authorId.toString()
    return {
      id: String(comment._id),
      body: comment.body,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
      author: authors.get(authorId) ?? null,
      canDelete: Boolean(
        viewer?.id === authorId || access.isModerator || access.isAdmin || viewer?.role === 'admin',
      ),
    }
  })
}

export async function createComment(
  user: SessionUser,
  postId: string,
  input: CreateCommentInput,
): Promise<string> {
  assertCanParticipate(user)
  await connectToDatabase()
  const post = await PostModel.findById(postId).lean<PostRecord | null>()
  if (!post || post.status !== 'published') throw new AppError('POST_NOT_FOUND')

  const access = await getCommunityAccess(post.communityId.toString(), user)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
  if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')
  if (access.community.status !== 'active') throw new AppError('COMMUNITY_ARCHIVED')
  if (access.membership?.status !== 'active') throw new AppError('NOT_MEMBER')

  const comment = await CommentModel.create({
    postId,
    communityId: post.communityId,
    authorId: user.id,
    body: input.body,
    status: 'published',
  })

  await PostModel.updateOne({ _id: postId }, { $inc: { commentCount: 1 } })
  await awardXp(user.id, 'comment_created', String(comment._id))

  return String(comment._id)
}

export async function deleteComment(user: SessionUser, commentId: string): Promise<void> {
  await connectToDatabase()
  const comment = await CommentModel.findById(commentId).lean<CommentRecord | null>()
  if (!comment) throw new AppError('NOT_FOUND')

  const access = await getCommunityAccess(comment.communityId.toString(), user)
  if (!access) throw new AppError('COMMUNITY_NOT_FOUND')

  const isAuthor = comment.authorId.toString() === user.id
  const canModerate = access.isModerator || access.isAdmin || user.role === 'admin'
  if (!isAuthor && !canModerate) throw new AppError('FORBIDDEN')
  if (comment.status === 'removed') return

  await CommentModel.updateOne({ _id: commentId }, { $set: { status: 'removed' } })
  await PostModel.updateOne(
    { _id: comment.postId, commentCount: { $gt: 0 } },
    { $inc: { commentCount: -1 } },
  )
}

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}
