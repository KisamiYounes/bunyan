import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, Pencil, ScrollText } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatDate, formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { getPublicationBySlug } from '@/modules/learning/publication.service'
import { getBookmarkState, getFollowState } from '@/modules/library/library.service'
import { BookmarkButton, FollowButton } from '@/components/learning/actions'
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
  return { title: dict.meta.publicationsTitle }
}

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  const publication = await getPublicationBySlug(slug, viewer).catch(() => null)
  if (!publication) notFound()

  const [bookmarked, following] = viewer
    ? await Promise.all([
        getBookmarkState(viewer.id, 'publication', publication.id),
        getFollowState(viewer.id, 'publication', publication.id),
      ])
    : [false, false]

  const publishedChapters = publication.chapters.filter((chapter) => chapter.status === 'published')
  const progressChapter = publication.progress
    ? publication.chapters.find((chapter) => chapter.id === publication.progress!.chapterId)
    : undefined
  const firstChapter = publishedChapters[0]
  const continueChapter =
    progressChapter && progressChapter.status === 'published' ? progressChapter : firstChapter

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/publications`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.common.back}
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {publication.topic ? (
            <Badge variant="neutral">{dict.communities.topicOptions[publication.topic]}</Badge>
          ) : null}
          <Badge variant="accent">
            {format(dict.publications.chaptersCount, {
              count: formatNumber(publication.chapterCount, locale),
            })}
          </Badge>
          {publication.status !== 'published' ? (
            <Badge variant="warning">{dict.studio.draft}</Badge>
          ) : null}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{publication.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{publication.summary}</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {publication.author ? (
            <span className="inline-flex items-center gap-2">
              <Avatar name={publication.author.name} src={publication.author.avatarUrl} size="sm" />
              {format(dict.publications.byAuthor, { name: publication.author.name })}
            </span>
          ) : null}
          {publication.publishedAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDate(publication.publishedAt, locale)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {continueChapter ? (
            <Link
              href={`/${locale}/publications/${publication.slug}/chapters/${continueChapter.id}`}
              className={buttonStyles('primary', 'md')}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {publication.progress
                ? dict.publications.continueReading
                : dict.publications.startReading}
            </Link>
          ) : null}

          {publication.canEdit ? (
            <Link
              href={`/${locale}/studio/publications/${publication.id}`}
              className={buttonStyles('secondary', 'md')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {dict.publications.editInStudio}
            </Link>
          ) : null}

          <BookmarkButton
            targetType="publication"
            targetId={publication.id}
            initialBookmarked={bookmarked}
            authenticated={Boolean(viewer)}
            locale={locale}
            labels={{
              bookmark: dict.common.bookmark,
              bookmarked: dict.common.bookmarked,
              signIn: dict.common.signInToSave,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />

          <FollowButton
            targetType="publication"
            targetId={publication.id}
            initialFollowing={following}
            authenticated={Boolean(viewer)}
            locale={locale}
            labels={{
              follow: dict.common.follow,
              following: dict.common.following,
              signIn: dict.common.signInToSave,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
        </div>

        {publication.progress && progressChapter ? (
          <p className="text-xs text-muted-foreground">
            {format(dict.library.lastRead, { chapter: progressChapter.title })}
          </p>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{dict.studio.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
            {publication.description}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{dict.publications.tableOfContents}</h2>
        {publication.chapters.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-8 w-8" aria-hidden="true" />}
            title={dict.publications.noChapters}
            description={dict.publications.noChaptersHint}
          />
        ) : (
          <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
            {publication.chapters.map((chapter) => (
              <li key={chapter.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold">
                  {formatNumber(chapter.position + 1, locale)}
                </span>
                <div className="min-w-0 flex-1">
                  {chapter.status === 'published' ? (
                    <Link
                      href={`/${locale}/publications/${publication.slug}/chapters/${chapter.id}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {chapter.title}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-medium">{chapter.title}</span>
                  )}
                  {chapter.publishedAt ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(chapter.publishedAt, locale)}
                    </span>
                  ) : null}
                </div>
                {chapter.status === 'published' ? (
                  <Badge variant="success">{dict.publications.chapterRead}</Badge>
                ) : (
                  <Badge variant="warning">{dict.publications.draftChapter}</Badge>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
