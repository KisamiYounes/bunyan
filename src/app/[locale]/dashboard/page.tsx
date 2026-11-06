import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  Compass,
  GraduationCap,
  Library,
  PenLine,
  Plus,
  Settings,
  Shield,
  UserRound,
  Users,
} from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatDate, formatNumber, formatRelative } from '@/shared/utils/format'
import { progressToNextLevel } from '@/shared/utils/level'
import { getSessionUser } from '@/modules/identity/session'
import { canAuthorLearning } from '@/modules/identity/authorization'
import {
  getUserCommunities,
  getUserContributionStats,
} from '@/modules/communities/community.service'
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
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.dashboardTitle }
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard`)}`)

  const [communities, stats, posts] = await Promise.all([
    getUserCommunities(viewer.id),
    getUserContributionStats(viewer.id),
    listUserPosts(viewer.id, viewer, 5),
  ])
  const progress = progressToNextLevel(viewer.xp)
  const canCreate =
    viewer.status === 'active' && viewer.ageBand !== 'teen' && viewer.ageBand !== 'child'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.dashboard.subtitle}
        title={format(dict.dashboard.welcome, { name: viewer.name })}
        actions={
          canCreate ? (
            <Link href={`/${locale}/communities/new`} className={buttonStyles('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {dict.dashboard.createCommunity}
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={dict.dashboard.statsCommunities}
          value={formatNumber(stats.communities, locale)}
        />
        <Stat label={dict.dashboard.statsPosts} value={formatNumber(stats.posts, locale)} />
        <Stat label={dict.dashboard.statsComments} value={formatNumber(stats.comments, locale)} />
        <Stat
          label={dict.dashboard.statsXp}
          value={formatNumber(viewer.xp, locale)}
          hint={`${dict.common.level} ${formatNumber(viewer.level, locale)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>{dict.dashboard.myCommunities}</CardTitle>
              <Link
                href={`/${locale}/communities`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {dict.dashboard.browseCommunities}
              </Link>
            </CardHeader>
            <CardContent>
              {communities.length === 0 ? (
                <EmptyState
                  icon={<Compass className="h-8 w-8" aria-hidden="true" />}
                  title={dict.dashboard.emptyCommunities}
                  description={dict.dashboard.emptyCommunitiesHint}
                  action={
                    <Link href={`/${locale}/communities`} className={buttonStyles('outline', 'sm')}>
                      {dict.dashboard.browseCommunities}
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {communities.map((entry) => (
                    <li key={entry.community.id} className="flex items-center gap-3 py-3">
                      <Link
                        href={`/${locale}/communities/${entry.community.slug}`}
                        className="min-w-0 flex-1"
                      >
                        <span className="block truncate font-medium hover:text-primary">
                          {entry.community.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatNumber(entry.community.memberCount, locale)}
                          </span>
                          <span>{formatRelative(entry.community.createdAt, locale)}</span>
                        </span>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant={entry.community.visibility === 'private' ? 'warning' : 'success'}
                        >
                          {entry.community.visibility === 'private'
                            ? dict.common.private
                            : dict.common.public}
                        </Badge>
                        {entry.status === 'pending' ? (
                          <Badge variant="neutral">{dict.common.pending}</Badge>
                        ) : entry.role !== 'member' ? (
                          <Badge variant="accent">
                            {entry.role === 'owner' ? dict.common.owner : dict.common.moderator}
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <EmptyState
                  icon={<PenLine className="h-8 w-8" aria-hidden="true" />}
                  title={dict.profile.noPosts}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {posts.map((post) => (
                    <li key={post.id} className="py-3">
                      <Link
                        href={`/${locale}/communities/${post.communitySlug}/posts/${post.id}`}
                        className="block font-medium hover:text-primary"
                      >
                        {post.title || `${post.body.slice(0, 80)}…`}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {post.communityName} · {formatRelative(post.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={viewer.name} src={viewer.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{viewer.name}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    @{viewer.username}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {dict.common.level} {formatNumber(viewer.level, locale)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(progress.percent, locale)}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(viewer.xp, locale)} {dict.common.points}
                </p>
              </div>

              <dl className="space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.common.joined}</dt>
                  <dd>{formatDate(viewer.createdAt, locale)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.admin.role}</dt>
                  <dd>
                    {viewer.role === 'admin'
                      ? dict.common.administrator
                      : viewer.role === 'educator'
                        ? dict.common.educator
                        : dict.common.learner}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.quickLinks}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <QuickLink
                href={`/${locale}/u/${viewer.username}`}
                icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
                label={dict.common.profile}
              />
              <QuickLink
                href={`/${locale}/settings`}
                icon={<Settings className="h-4 w-4" aria-hidden="true" />}
                label={dict.dashboard.editProfile}
              />
              <QuickLink
                href={`/${locale}/communities`}
                icon={<Compass className="h-4 w-4" aria-hidden="true" />}
                label={dict.dashboard.browseCommunities}
              />
              <QuickLink
                href={`/${locale}/courses`}
                icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
                label={dict.courses.title}
              />
              <QuickLink
                href={`/${locale}/library`}
                icon={<Library className="h-4 w-4" aria-hidden="true" />}
                label={dict.library.title}
              />
              {canAuthorLearning(viewer) ? (
                <QuickLink
                  href={`/${locale}/studio`}
                  icon={<PenLine className="h-4 w-4" aria-hidden="true" />}
                  label={dict.studio.title}
                />
              ) : null}
              {viewer.role === 'admin' ? (
                <QuickLink
                  href={`/${locale}/admin`}
                  icon={<Shield className="h-4 w-4" aria-hidden="true" />}
                  label={dict.dashboard.adminPanel}
                />
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  )
}
