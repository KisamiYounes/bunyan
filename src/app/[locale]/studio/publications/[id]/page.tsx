import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { canAuthorLearning } from '@/modules/identity/authorization'
import { getPublicationForEdit } from '@/modules/learning/publication.service'
import { PageHeader } from '@/components/shared/page-header'
import { StudioAuthorOnly } from '@/components/learning/studio-guard'
import { PublicationForm } from '@/components/learning/publication-form'
import { ChapterEditor } from '@/components/learning/chapter-editor'
import { ManageActions } from '@/components/learning/manage-actions'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.studio.publicationEditor }
}

export default async function EditPublicationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio/publications/${id}`)}`)
  }
  if (!canAuthorLearning(viewer)) {
    return <StudioAuthorOnly locale={locale} title={dict.studio.publicationEditor} />
  }

  const publication = await getPublicationForEdit(viewer, id).catch(() => null)
  if (!publication) notFound()

  const publishedChapters = publication.chapters.filter((chapter) => chapter.status === 'published')

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/studio`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.studio.backToStudio}
      </Link>

      <PageHeader
        eyebrow={dict.studio.publicationEditor}
        title={publication.title}
        description={dict.studio.publicationsSubtitle}
        actions={
          <>
            <Badge variant={publication.status === 'published' ? 'success' : 'warning'}>
              {dict.studio[publication.status]}
            </Badge>
            {publication.status === 'published' ? (
              <Link
                href={`/${locale}/publications/${publication.slug}`}
                className={buttonStyles('outline', 'sm')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {dict.studio.open}
              </Link>
            ) : null}
          </>
        }
      />

      <ManageActions
        kind="publication"
        id={publication.id}
        status={publication.status}
        canPublish={publishedChapters.length > 0}
        labels={{
          publish: dict.studio.publishPublication,
          publishing: dict.studio.publishing,
          archive: dict.studio.archive,
          archiving: dict.studio.archiving,
          confirmArchive: dict.studio.confirmArchive,
          publishBlocked: dict.studio.publishBlockedPublication,
          publishedSuccess: dict.studio.publishedSuccess,
          archivedSuccess: dict.studio.archivedSuccess,
          genericError: dict.errors.generic,
          errors: dict.errors,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{dict.studio.publicationSettings}</CardTitle>
        </CardHeader>
        <CardContent>
          <PublicationForm
            locale={locale}
            mode="edit"
            publicationId={publication.id}
            initial={{
              title: publication.title,
              slug: publication.slug,
              summary: publication.summary,
              description: publication.description,
              topic: publication.topic,
              language: publication.language as 'ar' | 'en' | 'fr',
            }}
            labels={{
              title: dict.studio.publicationTitle,
              summary: dict.studio.publicationSummary,
              summaryHint: dict.studio.summaryHint,
              description: dict.studio.description,
              descriptionHint: dict.studio.descriptionHint,
              slug: dict.studio.slug,
              slugHint: dict.studio.slugHint,
              topic: dict.studio.topic,
              language: dict.studio.language,
              submit: dict.studio.saveChanges,
              submitting: dict.common.saving,
              saved: dict.studio.saved,
              genericError: dict.errors.generic,
              errors: dict.errors,
              topicOptions: dict.communities.topicOptions,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.studio.chapters}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChapterEditor
            locale={locale}
            publicationId={publication.id}
            publicationSlug={publication.slug}
            chapters={publication.chapters}
            labels={{
              addChapter: dict.studio.addChapter,
              chapterTitle: dict.studio.chapterTitle,
              chapterContent: dict.studio.chapterContent,
              addChapterAction: dict.studio.addChapterAction,
              chapterEmpty: dict.studio.chapterEmpty,
              chapterEmptyHint: dict.studio.chapterEmptyHint,
              publishChapter: dict.studio.publishChapter,
              unpublishChapter: dict.studio.unpublishChapter,
              chapterDraft: dict.studio.chapterDraft,
              chapterPublished: dict.studio.chapterPublished,
              deleteChapter: dict.studio.deleteChapter,
              confirmDeleteChapter: dict.studio.confirmDeleteChapter,
              saveChanges: dict.studio.saveChanges,
              open: dict.studio.open,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
