import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, Lock, MessageSquare, Shield, Users } from 'lucide-react'
import { isLocale, localeLabels } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatDate, formatNumber, formatRelative } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import {
  getCommunityAccessBySlug,
  getCommunityMembers,
  getPendingMemberships,
  type MemberView,
} from '@/modules/communities/community.service'
import { listCommunityPosts } from '@/modules/communities/post.service'
import { PageHeader, Pagination } from '@/components/shared/page-header'
import {
  JoinButton,
  PostComposer,
  LikeButton,
  DeletePostButton,
} from '@/components/communities/actions'
import { ReportButton } from '@/components/communities/report-button'
import { MembershipManager } from '@/components/communities/membership-manager'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.communitiesTitle }
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const query = await searchParams
  const page = Number.parseInt(query.page ?? '1', 10) || 1

  const viewer = await getSessionUser()
  const access = await getCommunityAccessBySlug(slug, viewer).catch(() => null)
  if (!access) notFound()

  const { community, membership, canView, canPost, isModerator, isOwner, isAdmin } = access
  const canModerate = isModerator || isAdmin
  const authenticated = Boolean(viewer)

  const reportLabels = {
    report: dict.communities.report,
    title: dict.communities.reportTitle,
    subtitle: dict.communities.reportSubtitle,
    reason: dict.communities.reportReason,
    details: dict.communities.reportDetails,
    detailsPlaceholder: dict.communities.reportDetailsPlaceholder,
    submit: dict.common.submit,
    submitting: dict.common.saving,
    cancel: dict.common.cancel,
    success: dict.communities.reportSuccess,
    genericError: dict.errors.generic,
    errors: dict.errors,
    reasons: dict.posts.reasons,
  }

  const backLink = (
    <Link
      href={`/${locale}/communities`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      {dict.common.back}
    </Link>
  )

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
        {backLink}
        <PageHeader title={community.name} description={community.description} />
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-warning" aria-hidden="true" />
              <p className="font-medium">{dict.communities.privateBadge}</p>
            </div>
            <p className="text-sm text-muted-foreground">{dict.errors.communityPrivate}</p>
            <JoinButton
              locale={locale}
              communityId={community.id}
              visibility={community.visibility}
              status={membership?.status ?? null}
              isOwner={isOwner}
              authenticated={authenticated}
              labels={{
                join: dict.communities.join,
                requestJoin: dict.communities.requestJoin,
                joined: dict.communities.joined,
                pending: dict.communities.pending,
                leave: dict.communities.leave,
                joinSuccess: dict.communities.joinSuccess,
                requestSuccess: dict.communities.requestSuccess,
                leaveSuccess: dict.communities.leaveSuccess,
                genericError: dict.errors.generic,
                errors: dict.errors,
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const feed = await listCommunityPosts(community.id, viewer, page, 10)

  let members: MemberView[] = []
  let pending: MemberView[] = []
  try {
    members = await getCommunityMembers(community.id, viewer)
    if (canModerate && viewer) {
      pending = await getPendingMemberships(community.id, viewer)
    }
  } catch {
    members = []
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      {backLink}

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={community.visibility === 'private' ? 'warning' : 'success'}>
            {community.visibility === 'private'
              ? dict.communities.privateBadge
              : dict.communities.open}
          </Badge>
          {community.topic ? (
            <Badge variant="neutral">{dict.communities.topicOptions[community.topic]}</Badge>
          ) : null}
          {community.status !== 'active' ? (
            <Badge variant="danger">
              {community.status === 'archived' ? dict.common.archived : dict.common.suspended}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{community.name}</h1>
            <p className="text-muted-foreground">{community.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {format(dict.communities.memberCount, {
                  count: formatNumber(community.memberCount, locale),
                })}
              </span>
              <span>
                {format(dict.communities.postCount, {
                  count: formatNumber(community.postCount, locale),
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(community.createdAt, locale)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <JoinButton
              locale={locale}
              communityId={community.id}
              visibility={community.visibility}
              status={membership?.status ?? null}
              isOwner={isOwner}
              authenticated={authenticated}
              labels={{
                join: dict.communities.join,
                requestJoin: dict.communities.requestJoin,
                joined: dict.communities.joined,
                pending: dict.communities.pending,
                leave: dict.communities.leave,
                joinSuccess: dict.communities.joinSuccess,
                requestSuccess: dict.communities.requestSuccess,
                leaveSuccess: dict.communities.leaveSuccess,
                genericError: dict.errors.generic,
                errors: dict.errors,
              }}
            />
            {canModerate ? (
              <a href="#manage" className={buttonStyles('outline', 'sm')}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                {dict.communities.manage}
              </a>
            ) : null}
            {viewer ? (
              <ReportButton targetType="community" targetId={community.id} labels={reportLabels} />
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {canPost ? (
            <PostComposer
              communityId={community.id}
              labels={{
                titlePlaceholder: dict.communities.postTitlePlaceholder,
                postPlaceholder: dict.communities.postPlaceholder,
                publish: dict.communities.publish,
                posting: dict.communities.posting,
                success: dict.communities.postCreated,
                titleLabel: dict.communities.postTitlePlaceholder,
                bodyLabel: dict.communities.postPlaceholder,
                genericError: dict.errors.generic,
                errors: dict.errors,
              }}
            />
          ) : community.status !== 'active' ? (
            <Alert variant="warning">{dict.errors.communityArchived}</Alert>
          ) : !viewer ? (
            <Alert variant="info">
              <Link href={`/${locale}/login`} className="font-medium text-primary hover:underline">
                {dict.common.signIn}
              </Link>{' '}
              — {dict.communities.join}
            </Alert>
          ) : membership?.status === 'pending' ? (
            <Alert variant="info">{dict.communities.pending}</Alert>
          ) : (
            <Alert variant="warning">
              {viewer.ageBand === 'teen' && !viewer.guardianConsentAt
                ? dict.errors.guardianRequired
                : dict.errors.notMember}
            </Alert>
          )}

          <h2 className="text-lg font-semibold">{dict.communities.feed}</h2>

          {feed.items.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" aria-hidden="true" />}
              title={dict.communities.noPosts}
              description={dict.communities.noPostsHint}
            />
          ) : (
            <div className="space-y-4">
              {feed.items.map((post) => (
                <Card key={post.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {post.title ? (
                          <Link
                            href={`/${locale}/communities/${community.slug}/posts/${post.id}`}
                            className="text-lg font-semibold hover:text-primary"
                          >
                            {post.title}
                          </Link>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {post.author ? (
                            <Link
                              href={`/${locale}/u/${post.author.username}`}
                              className="hover:underline"
                            >
                              {post.author.name}
                            </Link>
                          ) : (
                            dict.common.unknown
                          )}
                          {' · '}
                          {formatRelative(post.createdAt, locale)}
                        </p>
                      </div>
                      {post.status === 'removed' ? (
                        <Badge variant="danger">{dict.common.removed}</Badge>
                      ) : null}
                    </div>

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {post.body.length > 600 ? `${post.body.slice(0, 600)}…` : post.body}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <LikeButton
                        postId={post.id}
                        liked={post.likedByMe}
                        count={post.likeCount}
                        labels={{
                          like: dict.communities.like,
                          liked: dict.communities.liked,
                          genericError: dict.errors.generic,
                          errors: dict.errors,
                        }}
                      />
                      <Link
                        href={`/${locale}/communities/${community.slug}/posts/${post.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-surface-muted"
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        {formatNumber(post.commentCount, locale)}
                      </Link>
                      <Link
                        href={`/${locale}/communities/${community.slug}/posts/${post.id}`}
                        className="ms-auto text-sm font-medium text-primary hover:underline"
                      >
                        {dict.communities.comments}
                      </Link>
                      {post.canDelete ? (
                        <DeletePostButton
                          postId={post.id}
                          labels={{
                            deletePost: dict.communities.deletePost,
                            confirmDeletePost: dict.communities.confirmDeletePost,
                            genericError: dict.errors.generic,
                            errors: dict.errors,
                          }}
                        />
                      ) : null}
                      {viewer ? (
                        <ReportButton targetType="post" targetId={post.id} labels={reportLabels} />
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Pagination
            basePath={`/${locale}/communities/${community.slug}`}
            page={feed.page}
            totalItems={feed.total}
            limit={feed.limit}
            labels={{
              previous: dict.common.previous,
              next: dict.common.next,
              pageOf: dict.common.pageOf,
            }}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{dict.communities.about}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">{community.description}</p>
              <dl className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.communities.language}</dt>
                  <dd>
                    {isLocale(community.language)
                      ? localeLabels[community.language]
                      : community.language}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.communities.members}</dt>
                  <dd className="tabular-nums">{formatNumber(community.memberCount, locale)}</dd>
                </div>
              </dl>
              {community.rules ? (
                <div className="space-y-1 border-t border-border pt-3">
                  <p className="font-medium">{dict.communities.rules}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{community.rules}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.communities.members}</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.common.unknown}</p>
              ) : (
                <ul className="space-y-2.5">
                  {members.slice(0, 10).map((member) => (
                    <li key={member.membershipId}>
                      {member.user ? (
                        <Link
                          href={`/${locale}/u/${member.user.username}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar name={member.user.name} src={member.user.avatarUrl} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{member.user.name}</span>
                            {member.role !== 'member' ? (
                              <span className="block text-xs text-accent">
                                {member.role === 'owner'
                                  ? dict.common.owner
                                  : dict.common.moderator}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {canModerate ? (
        <div id="manage" className="scroll-mt-20">
          <MembershipManager
            locale={locale}
            communityId={community.id}
            members={members.map((member) => ({
              membershipId: member.membershipId,
              role: member.role,
              status: member.status,
              joinedAt: member.joinedAt,
              user: member.user
                ? {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    avatarUrl: member.user.avatarUrl,
                  }
                : null,
            }))}
            pending={pending.map((member) => ({
              membershipId: member.membershipId,
              role: member.role,
              status: member.status,
              joinedAt: member.joinedAt,
              user: member.user
                ? {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    avatarUrl: member.user.avatarUrl,
                  }
                : null,
            }))}
            isOwner={isOwner}
            isAdmin={isAdmin}
            labels={{
              membersTitle: dict.communities.membersTitle,
              pendingRequests: dict.communities.pendingRequests,
              noPendingRequests: dict.communities.noPendingRequests,
              approve: dict.communities.approve,
              reject: dict.communities.reject,
              removeMember: dict.communities.removeMember,
              changeRole: dict.communities.changeRole,
              roleUpdated: dict.communities.roleUpdated,
              approveSuccess: dict.communities.approveSuccess,
              rejectSuccess: dict.communities.rejectSuccess,
              archiveCommunity: dict.communities.archiveCommunity,
              archiveSuccess: dict.communities.archiveSuccess,
              genericError: dict.errors.generic,
              errors: dict.errors,
              roleLabels: {
                owner: dict.common.owner,
                moderator: dict.common.moderator,
                member: dict.common.member,
              },
            }}
          />
        </div>
      ) : null}

      <div>
        <Link
          href={`/${locale}/communities`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {dict.common.back}
        </Link>
      </div>
    </div>
  )
}
