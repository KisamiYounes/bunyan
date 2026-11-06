import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { getChapterForViewer } from '@/modules/learning/publication.service'
import { ReadingTracker } from '@/components/learning/actions'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.publicationsTitle }
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; chapterId: string }>
}) {
  const { locale, slug, chapterId } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  const chapter = await getChapterForViewer(slug, chapterId, viewer).catch(() => null)
  if (!chapter) notFound()

  const progressPercent = Math.round(chapter.scroll * 100)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/publications/${chapter.publicationSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {dict.publications.backToPublication}
        </Link>
        <ReadingTracker
          publicationId={chapter.publicationId}
          chapterId={chapter.id}
          initialScroll={chapter.scroll}
          authenticated={Boolean(viewer)}
          labels={{
            resumedAt: dict.publications.resumedAt,
            signInToSave: dict.publications.signInToSave,
          }}
        />
      </div>

      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {chapter.publicationTitle}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{chapter.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {format(dict.publications.chaptersCount, {
              count: formatNumber(chapter.position + 1, locale),
            })}
          </span>
          {chapter.status !== 'published' ? (
            <Badge variant="warning">{dict.publications.draftChapter}</Badge>
          ) : null}
          {progressPercent > 0 ? (
            <span>
              {format(dict.publications.readingProgress, {
                percent: formatNumber(progressPercent, locale),
              })}
            </span>
          ) : null}
        </div>
      </header>

      <article className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="text-base leading-8 whitespace-pre-wrap text-foreground">
          {chapter.content}
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {chapter.prevChapterId ? (
          <Link
            href={`/${locale}/publications/${chapter.publicationSlug}/chapters/${chapter.prevChapterId}`}
            className={buttonStyles('outline', 'md')}
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {dict.common.previous}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {chapter.nextChapterId ? (
          <Link
            href={`/${locale}/publications/${chapter.publicationSlug}/chapters/${chapter.nextChapterId}`}
            className={buttonStyles('secondary', 'md')}
          >
            {dict.common.next}
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
