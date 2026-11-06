import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import type { ReportStatus } from '@/shared/constants'
import type { PublicUser, SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { inspectReportTarget } from '@/modules/communities/report-targets'
import { PostModel } from '@/modules/communities/post.model'
import { CommentModel } from '@/modules/communities/comment.model'
import { CommunityModel } from '@/modules/communities/community.model'
import { ReportModel, type ReportRecord } from './report.model'
import type { CreateReportInput } from './validation'

export interface ReportView {
  id: string
  targetType: string
  targetId: string
  targetLabel: string
  targetHref?: string
  reason: string
  details?: string
  status: ReportStatus
  createdAt: string
  reporter: PublicUser | null
}

export async function createReport(
  user: SessionUser,
  input: CreateReportInput,
): Promise<{ id: string; duplicate: boolean }> {
  const info = await inspectReportTarget(input.targetType, input.targetId, user)

  await connectToDatabase()
  const existing = await ReportModel.findOne({
    reporterId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
  })
    .select('_id')
    .lean<{ _id: unknown } | null>()

  if (existing) return { id: String(existing._id), duplicate: true }

  try {
    const report = await ReportModel.create({
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      communityId: info.communityId,
      targetLabel: info.label.slice(0, 200),
      reason: input.reason,
      details: input.details,
      status: 'open',
    })
    return { id: String(report._id), duplicate: false }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    ) {
      const duplicate = await ReportModel.findOne({
        reporterId: user.id,
        targetType: input.targetType,
        targetId: input.targetId,
      })
        .select('_id')
        .lean<{ _id: unknown } | null>()
      return { id: duplicate ? String(duplicate._id) : '', duplicate: true }
    }
    throw error
  }
}

export async function listReports(status?: ReportStatus): Promise<ReportView[]> {
  await connectToDatabase()
  const filter = status ? { status } : {}
  const reports = await ReportModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<ReportRecord[]>()

  const reporters = await getUsersByIds(reports.map((report) => report.reporterId.toString()))
  const hrefs = await buildTargetHrefs(reports)

  return reports.map((report) => ({
    id: String(report._id),
    targetType: report.targetType,
    targetId: report.targetId,
    targetLabel: report.targetLabel,
    targetHref: hrefs.get(`${report.targetType}:${report.targetId}`),
    reason: report.reason,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reporter: reporters.get(report.reporterId.toString()) ?? null,
  }))
}

const OBJECT_ID = /^[a-f\d]{24}$/i

/**
 * Resolves links for reported content in bulk so the moderation queue can jump straight to the
 * target without issuing one query per row.
 */
async function buildTargetHrefs(reports: ReportRecord[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const collect = (type: string) =>
    [
      ...new Set(
        reports.filter((report) => report.targetType === type).map((report) => report.targetId),
      ),
    ].filter((id) => OBJECT_ID.test(id))

  const postIds = collect('post')
  const commentIds = collect('comment')
  const communityIds = collect('community')
  const userIds = collect('user')

  const [posts, comments, users] = await Promise.all([
    postIds.length
      ? PostModel.find({ _id: { $in: postIds } })
          .select('communityId')
          .lean<Array<{ _id: unknown; communityId: unknown }>>()
      : Promise.resolve([]),
    commentIds.length
      ? CommentModel.find({ _id: { $in: commentIds } })
          .select('communityId postId')
          .lean<Array<{ _id: unknown; communityId: unknown; postId: unknown }>>()
      : Promise.resolve([]),
    userIds.length ? getUsersByIds(userIds) : Promise.resolve(new Map<string, PublicUser>()),
  ])

  const allCommunityIds = [
    ...new Set([
      ...communityIds,
      ...posts.map((post) => String(post.communityId)),
      ...comments.map((comment) => String(comment.communityId)),
    ]),
  ]
  const communities =
    allCommunityIds.length > 0
      ? await CommunityModel.find({ _id: { $in: allCommunityIds } })
          .select('slug')
          .lean<Array<{ _id: unknown; slug: string }>>()
      : []

  const slugById = new Map(communities.map((community) => [String(community._id), community.slug]))

  for (const post of posts) {
    const slug = slugById.get(String(post.communityId))
    if (slug)
      result.set(`post:${String(post._id)}`, `/communities/${slug}/posts/${String(post._id)}`)
  }
  for (const comment of comments) {
    const slug = slugById.get(String(comment.communityId))
    if (slug) {
      result.set(
        `comment:${String(comment._id)}`,
        `/communities/${slug}/posts/${String(comment.postId)}`,
      )
    }
  }
  for (const communityId of communityIds) {
    const slug = slugById.get(communityId)
    if (slug) result.set(`community:${communityId}`, `/communities/${slug}`)
  }
  for (const userId of userIds) {
    const user = users.get(userId)
    if (user) result.set(`user:${userId}`, `/u/${user.username}`)
  }

  return result
}

export async function resolveReport(
  actor: SessionUser,
  reportId: string,
  status: 'resolved' | 'dismissed' | 'escalated',
): Promise<void> {
  await connectToDatabase()
  const result = await ReportModel.updateOne(
    { _id: reportId },
    { $set: { status, resolvedBy: actor.id, resolvedAt: new Date() } },
  )
  if (result.matchedCount === 0) throw new AppError('REPORT_NOT_FOUND')
}

export async function countOpenReports(): Promise<number> {
  await connectToDatabase()
  return ReportModel.countDocuments({ status: { $in: ['open', 'escalated'] } })
}
