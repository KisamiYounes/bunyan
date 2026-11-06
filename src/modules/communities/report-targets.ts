import type { Types } from 'mongoose'
import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import type { ReportTargetType } from '@/shared/constants'
import type { SessionUser } from '@/modules/identity/dto'
import { getUserById } from '@/modules/identity/user.service'
import { CommentModel } from './comment.model'
import { getCommunityAccess, getCommunityAccessBySlug } from './community.service'
import { getPostForViewer } from './post.service'

export interface ReportTargetInfo {
  label: string
  href?: string
  communityId?: string
}

export async function inspectReportTarget(
  targetType: ReportTargetType,
  targetId: string,
  viewer: SessionUser,
): Promise<ReportTargetInfo> {
  await connectToDatabase()

  switch (targetType) {
    case 'post': {
      const { post, access } = await getPostForViewer(targetId, viewer)
      return {
        label: post.title || `${post.body.slice(0, 120)}…`,
        href: `/communities/${access.community.slug}/posts/${post.id}`,
        communityId: post.communityId,
      }
    }
    case 'comment': {
      const comment = await CommentModel.findById(targetId).lean<{
        _id: Types.ObjectId
        body: string
        communityId: Types.ObjectId
        postId: Types.ObjectId
      } | null>()
      if (!comment) throw new AppError('NOT_FOUND')
      const access = await getCommunityAccess(String(comment.communityId), viewer)
      if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
      if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')
      return {
        label: `${comment.body.slice(0, 120)}…`,
        href: `/communities/${access.community.slug}/posts/${comment.postId.toString()}`,
        communityId: String(comment.communityId),
      }
    }
    case 'community': {
      const access = await getCommunityAccess(String(targetId), viewer)
      if (!access) throw new AppError('COMMUNITY_NOT_FOUND')
      if (!access.canView) throw new AppError('COMMUNITY_PRIVATE')
      return {
        label: access.community.name,
        href: `/communities/${access.community.slug}`,
        communityId: access.community.id,
      }
    }
    case 'user': {
      const user = await getUserById(targetId)
      if (!user) throw new AppError('USER_NOT_FOUND')
      return { label: user.name, href: `/u/${user.username}` }
    }
    default:
      throw new AppError('VALIDATION_ERROR')
  }
}

export async function inspectCommunityReportTarget(
  slug: string,
  viewer: SessionUser,
): Promise<ReportTargetInfo> {
  const access = await getCommunityAccessBySlug(slug, viewer)
  return {
    label: access.community.name,
    href: `/communities/${access.community.slug}`,
    communityId: access.community.id,
  }
}
