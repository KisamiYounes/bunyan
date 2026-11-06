import type { SessionUser } from '@/modules/identity/dto'
import { countUsers, setUserAccountStatus } from '@/modules/identity/user.service'
import {
  adminSetCommunityStatus as setCommunityStatus,
  countAllPosts,
  countCommunities,
} from '@/modules/communities/community.service'
import { countOpenReports } from './report.service'
import { recordAudit } from './audit.service'

export interface AdminStats {
  users: number
  communities: number
  posts: number
  openReports: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [users, communities, posts, openReports] = await Promise.all([
    countUsers(),
    countCommunities(),
    countAllPosts(),
    countOpenReports(),
  ])
  return { users, communities, posts, openReports }
}

export async function adminSetUserStatus(
  actor: SessionUser,
  userId: string,
  action: 'suspend' | 'restore',
): Promise<void> {
  const status = action === 'suspend' ? 'suspended' : 'active'
  await setUserAccountStatus(actor.id, userId, status)
  await recordAudit({
    actorId: actor.id,
    action: action === 'suspend' ? 'user.suspend' : 'user.restore',
    targetType: 'user',
    targetId: userId,
  })
}

export async function adminSetCommunityStatus(
  actor: SessionUser,
  communityId: string,
  action: 'archive' | 'suspend' | 'activate',
): Promise<void> {
  const status = action === 'archive' ? 'archived' : action === 'suspend' ? 'suspended' : 'active'
  await setCommunityStatus(communityId, status)
  await recordAudit({
    actorId: actor.id,
    action: `community.${action}`,
    targetType: 'community',
    targetId: communityId,
  })
}
