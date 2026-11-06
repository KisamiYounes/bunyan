import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { canAuthorLearning } from '@/modules/identity/authorization'
import { PageHeader } from '@/components/shared/page-header'
import { StudioAuthorOnly } from '@/components/learning/studio-guard'
import { PublicationForm } from '@/components/learning/publication-form'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.studio.newPublication }
}

export default async function NewPublicationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio/publications/new`)}`)
  }
  if (!canAuthorLearning(viewer)) {
    return <StudioAuthorOnly locale={locale} title={dict.studio.newPublication} />
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/studio`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.studio.backToStudio}
      </Link>

      <PageHeader
        eyebrow={dict.nav.studio}
        title={dict.studio.newPublication}
        description={dict.studio.publicationsSubtitle}
      />

      <Card>
        <CardContent>
          <PublicationForm
            locale={locale}
            mode="create"
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
              submit: dict.studio.createPublication,
              submitting: dict.studio.creatingPublication,
              saved: dict.studio.saved,
              genericError: dict.errors.generic,
              errors: dict.errors,
              topicOptions: dict.communities.topicOptions,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
