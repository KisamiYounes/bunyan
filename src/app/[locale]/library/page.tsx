import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Bookmark, BookOpen, ScrollText, UserRound } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatNumber, formatRelative } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { getLibrary } from '@/modules/library/library.service'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.libraryTitle }
}

export default async function LibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/library`)}`)
  }

  const library = await getLibrary(viewer)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.nav.library}
        title={dict.library.title}
        description={dict.library.subtitle}
      />

      <Card>
        <CardHeader>
          <CardTitle>{dict.library.courses}</CardTitle>
        </CardHeader>
        <CardContent>
          {library.courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
              title={dict.library.emptyCourses}
              description={dict.library.emptyCoursesHint}
            />
          ) : (
            <ul className="divide-y divide-border">
              {library.courses.map((course) => {
                const percent = Math.round(course.progress * 100)
                const href = course.lastLessonId
                  ? `/${locale}/courses/${course.slug}/lessons/${course.lastLessonId}`
                  : `/${locale}/courses/${course.slug}`
                return (
                  <li key={course.id} className="space-y-2 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={href}
                        className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                      >
                        {course.title}
                      </Link>
                      {course.status === 'completed' ? (
                        <Badge variant="success">{dict.library.completed}</Badge>
                      ) : (
                        <Badge variant="neutral">
                          {format(dict.library.progress, {
                            percent: formatNumber(percent, locale),
                          })}
                        </Badge>
                      )}
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(course.completedLessonCount, locale)} /{' '}
                      {formatNumber(course.lessonCount, locale)} ·{' '}
                      {formatRelative(course.lastAccessedAt, locale)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.library.reading}</CardTitle>
        </CardHeader>
        <CardContent>
          {library.reading.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" aria-hidden="true" />}
              title={dict.library.emptyReading}
              description={dict.library.emptyReadingHint}
            />
          ) : (
            <ul className="divide-y divide-border">
              {library.reading.map((item) => (
                <li
                  key={`${item.publicationId}-${item.chapterId}`}
                  className="flex flex-wrap items-center gap-2 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${locale}/publications/${item.slug}/chapters/${item.chapterId}`}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {format(dict.library.lastRead, { chapter: item.chapterTitle })}
                    </p>
                  </div>
                  <Badge variant="accent">
                    {format(dict.library.progress, {
                      percent: formatNumber(Math.round(item.scroll * 100), locale),
                    })}
                  </Badge>
                  <Link
                    href={`/${locale}/publications/${item.slug}/chapters/${item.chapterId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {dict.library.continue}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.library.bookmarks}</CardTitle>
        </CardHeader>
        <CardContent>
          {library.bookmarks.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-8 w-8" aria-hidden="true" />}
              title={dict.library.emptyBookmarks}
              description={dict.library.emptyBookmarksHint}
            />
          ) : (
            <ul className="divide-y divide-border">
              {library.bookmarks.map((item) => (
                <li key={`${item.targetType}-${item.targetId}`} className="py-3">
                  <Link
                    href={`/${locale}/${item.targetType === 'course' ? 'courses' : 'publications'}/${item.slug}`}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.targetType === 'course' ? dict.courses.title : dict.publications.title}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.library.following}</CardTitle>
        </CardHeader>
        <CardContent>
          {library.following.length === 0 ? (
            <EmptyState
              icon={<UserRound className="h-8 w-8" aria-hidden="true" />}
              title={dict.library.emptyFollowing}
              description={dict.library.emptyFollowingHint}
            />
          ) : (
            <ul className="divide-y divide-border">
              {library.following.map((item) => {
                const href =
                  item.targetType === 'user'
                    ? `/${locale}/u/${item.username}`
                    : `/${locale}/${item.targetType === 'course' ? 'courses' : 'publications'}/${item.slug}`
                return (
                  <li key={`${item.targetType}-${item.targetId}`} className="py-3">
                    <Link href={href} className="block truncate font-medium hover:text-primary">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.targetType === 'user'
                        ? dict.common.profile
                        : item.targetType === 'course'
                          ? dict.courses.title
                          : dict.publications.title}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
