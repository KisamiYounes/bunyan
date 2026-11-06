import { describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { toSessionUser } from '@/modules/identity/dto'
import {
  createCommunity,
  getCommunityAccess,
  getCommunityMembers,
  joinCommunity,
  approveMembership,
} from '@/modules/communities/community.service'
import {
  createComment,
  createPost,
  getPostForViewer,
  listUserPosts,
  toggleLike,
} from '@/modules/communities/post.service'
import { CommunityModel } from '@/modules/communities/community.model'
import { MembershipModel } from '@/modules/communities/membership.model'
import { PostModel } from '@/modules/communities/post.model'
import { UserModel } from '@/modules/identity/user.model'
import { awardXp } from '@/modules/gamification/xp.service'
import { setupTestDatabase, createTestUser } from '../helpers/db'

setupTestDatabase()

const baseCommunity = {
  name: 'Public Lab',
  slug: 'public-lab',
  description: 'An open community for practising software engineering together.',
  visibility: 'public' as const,
  language: 'ar' as const,
  topic: 'programming' as const,
}

describe('community access boundaries', () => {
  it('exposes public communities and hides private ones from non-members', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Community Owner' }))
    const stranger = toSessionUser(await createTestUser({ name: 'Outsider' }))

    const open = await createCommunity(owner, baseCommunity)
    const openAccess = await getCommunityAccess(open.id, stranger)
    expect(openAccess?.canView).toBe(true)
    expect(openAccess?.canPost).toBe(false)
    expect(openAccess?.membership).toBeNull()

    const closed = await createCommunity(owner, {
      ...baseCommunity,
      name: 'Private Lab',
      slug: 'private-lab',
      visibility: 'private',
    })
    const closedAccess = await getCommunityAccess(closed.id, stranger)
    expect(closedAccess?.canView).toBe(false)
    await expect(getCommunityMembers(closed.id, stranger)).rejects.toMatchObject({
      code: 'COMMUNITY_PRIVATE',
    })
  })

  it('keeps joins pending until a moderator approves them', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Private Owner' }))
    const requester = toSessionUser(await createTestUser({ name: 'Requester' }))

    const closed = await createCommunity(owner, {
      ...baseCommunity,
      name: 'Closed Circle',
      slug: 'closed-circle',
      visibility: 'private',
    })

    const request = await joinCommunity(requester, closed.id)
    expect(request.status).toBe('pending')

    const pendingAccess = await getCommunityAccess(closed.id, requester)
    expect(pendingAccess?.canView).toBe(false)

    const membership = await MembershipModel.findOne({
      communityId: closed.id,
      userId: requester.id,
    }).lean()
    expect(membership?.status).toBe('pending')
    expect(membership?.role).toBe('member')

    await approveMembership(owner, String(membership?._id), 'approve')

    const approvedAccess = await getCommunityAccess(closed.id, requester)
    expect(approvedAccess?.canView).toBe(true)
    expect(approvedAccess?.canPost).toBe(true)
    expect(approvedAccess?.membership?.status).toBe('active')

    const reloaded = await CommunityModel.findById(closed.id).lean()
    expect(reloaded?.memberCount).toBe(2)
  })

  it('treats active memberships as tenants and rejects non-member posting', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Owner Two' }))
    const member = toSessionUser(await createTestUser({ name: 'Member Two' }))
    const stranger = toSessionUser(await createTestUser({ name: 'Stranger Two' }))

    const community = await createCommunity(owner, baseCommunity)
    await expect(
      createPost(stranger, community.id, { title: 'Intrusion', body: 'Should not work' }),
    ).rejects.toMatchObject({ code: 'NOT_MEMBER' })

    await joinCommunity(member, community.id)
    const postId = await createPost(member, community.id, {
      title: 'Hello community',
      body: 'A first contribution from a member.',
    })
    const { post } = await getPostForViewer(postId, member)
    expect(post.communitySlug).toBe('public-lab')
    expect(post.author?.id).toBe(member.id)
    expect(post.canDelete).toBe(true)
  })
})

describe('safeguarding enforcement', () => {
  it('requires guardian consent for teen participation and blocks teen ownership', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Adult Owner' }))
    const teen = toSessionUser(await createTestUser({ name: 'Teen', ageBand: 'teen' }))
    const consentedTeen = toSessionUser(
      await createTestUser({
        name: 'Consented Teen',
        ageBand: 'teen',
        guardianConsentAt: new Date(),
      }),
    )

    const community = await createCommunity(owner, baseCommunity)

    await expect(joinCommunity(teen, community.id)).rejects.toMatchObject({
      code: 'GUARDIAN_REQUIRED',
    })
    await expect(
      createCommunity(teen, {
        ...baseCommunity,
        name: 'Teen Space',
        slug: 'teen-space',
      }),
    ).rejects.toMatchObject({ code: 'NOT_ALLOWED' })

    const joined = await joinCommunity(consentedTeen, community.id)
    expect(joined.status).toBe('active')

    await expect(joinCommunity(consentedTeen, community.id)).rejects.toMatchObject({
      code: 'ALREADY_MEMBER',
    })
    const membership = await MembershipModel.findOne({
      communityId: community.id,
      userId: consentedTeen.id,
    }).lean()
    expect(membership?.status).toBe('active')
  })
})

describe('posts, comments, likes and XP', () => {
  it('updates denormalised counters and awards XP per contribution', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Contributor' }))
    const member = toSessionUser(await createTestUser({ name: 'Reader' }))

    const community = await createCommunity(owner, baseCommunity)
    await joinCommunity(member, community.id)

    const postId = await createPost(member, community.id, {
      title: 'Learning in public',
      body: 'Today I built my first small project.',
    })

    const memberAfterPost = await UserModel.findById(member.id).lean()
    expect(memberAfterPost?.xp).toBe(5)

    const commentId = await createComment(owner, postId, {
      body: 'Great start — keep shipping small projects.',
    })
    expect(commentId).toHaveLength(24)

    const ownerAfterComment = await UserModel.findById(owner.id).lean()
    expect(ownerAfterComment?.xp).toBe(2)

    const storedPost = await PostModel.findById(postId).lean()
    expect(storedPost?.commentCount).toBe(1)
    expect(storedPost?.likeCount).toBe(0)

    const like = await toggleLike(owner, postId)
    expect(like).toEqual({ liked: true, likeCount: 1 })
    const unlike = await toggleLike(owner, postId)
    expect(unlike).toEqual({ liked: false, likeCount: 0 })

    const communityAfter = await CommunityModel.findById(community.id).lean()
    expect(communityAfter?.postCount).toBe(1)
  })

  it('never lists private-community posts on public profiles', async () => {
    const owner = toSessionUser(await createTestUser({ name: 'Author' }))
    const outsider = toSessionUser(await createTestUser({ name: 'Profile Viewer' }))

    const open = await createCommunity(owner, baseCommunity)
    const closed = await createCommunity(owner, {
      ...baseCommunity,
      name: 'Private Notes',
      slug: 'private-notes',
      visibility: 'private',
    })

    await createPost(owner, open.id, { title: 'Public post', body: 'Visible to everyone.' })
    await createPost(owner, closed.id, { title: 'Private post', body: 'Members only.' })

    const publicView = await listUserPosts(owner.id, outsider, 10)
    expect(publicView.map((post) => post.title)).toEqual(['Public post'])

    const ownerView = await listUserPosts(owner.id, owner, 10)
    expect(ownerView.map((post) => post.title).sort()).toEqual(['Private post', 'Public post'])
  })

  it('awards duplicate XP events only once', async () => {
    const user = toSessionUser(await createTestUser({ name: 'Xp Tester' }))
    const refId = new mongoose.Types.ObjectId().toString()

    const first = await awardXp(user.id, 'post_created', refId)
    const second = await awardXp(user.id, 'post_created', refId)

    expect(first).toEqual({ awarded: true, points: 5 })
    expect(second).toEqual({ awarded: false, points: 0 })

    const stored = await UserModel.findById(user.id).lean()
    expect(stored?.xp).toBe(5)
    expect(stored?.level).toBe(1)
  })
})
