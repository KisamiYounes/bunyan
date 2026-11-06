import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, MessageSquare, PenLine, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatDate, formatNumber, formatRelative } from '@/shared/utils/format'
import { progressToNextLevel } from '@/shared/utils/level'
import { getSessionUser } from '@/modules/identity/session'
import { getProfileForViewer } from '@/modules/identity/user.service'
import { getUserContributionStats } from '@/modules/communities/community.service'
import { listUserPosts } from '@/modules/communities/post.service'
import { PageHeader, Stat } from '@/components/shared/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.profileTitle }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>
}) {
  const { locale, username } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  const profile = await getProfileForViewer(username, viewer)
  if (!profile) notFound()

  const { user, isPrivate } = profile
  const isOwner = viewer?.id === user.id
  const isMinor = user.ageBand === 'teen' || user.ageBand === 'child'

  if (isPrivate) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
        <PageHeader title={user.name} />
        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} size="lg" />
            <div className="space-y-1">
              <p className="font-medium">@{user.username}</p>
              <p className="text-sm text-muted-foreground">{dict.profile.privateProfile}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [stats, posts] = await Promise.all([
    getUserContributionStats(user.id),
    listUserPosts(user.id, viewer, 8),
  ])
  const progress = progressToNextLevel(user.xp)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
              <Badge variant="neutral">
                {user.role === 'admin'
                  ? dict.common.administrator
                  : user.role === 'educator'
                    ? dict.common.educator
                    : dict.common.learner}
              </Badge>
              {isMinor ? <Badge variant="warning">{dict.profile.minorNotice}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground" dir="ltr">
              @{user.username}
            </p>
            {user.bio ? <p className="text-sm whitespace-pre-wrap">{user.bio}</p> : null}
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {format(dict.profile.joinedAt, { date: formatDate(user.createdAt, locale) })}
            </p>
            {isOwner ? (
              <Link href={`/${locale}/settings`} className={buttonStyles('outline', 'sm')}>
                {dict.profile.editProfile}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dict.profile.posts} value={formatNumber(stats.posts, locale)} />
        <Stat label={dict.profile.comments} value={formatNumber(stats.comments, locale)} />
        <Stat label={dict.profile.communities} value={formatNumber(stats.communities, locale)} />
        <Stat
          label={dict.profile.xp}
          value={formatNumber(user.xp, locale)}
          hint={`${dict.common.level} ${formatNumber(user.level, locale)}`}
        />
      </div>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {dict.common.level} {formatNumber(user.level, locale)}
            </span>
            <span className="text-muted-foreground">{formatNumber(progress.percent, locale)}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{dict.profile.recentPosts}</h2>
        {posts.length === 0 ? (
          <EmptyState
            icon={<PenLine className="h-8 w-8" aria-hidden="true" />}
            title={dict.profile.noPosts}
          />
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Card>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {post.communitySlug ? (
                        <Link
                          href={`/${locale}/communities/${post.communitySlug}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {post.communityName}
                        </Link>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(post.createdAt, locale)}
                      </span>
                    </div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/${locale}/communities/${post.communitySlug}/posts/${post.id}`}
                        className="hover:text-primary"
                      >
                        {post.title || `${post.body.slice(0, 80)}…`}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{post.body}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatNumber(post.commentCount, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatNumber(post.likeCount, locale)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
