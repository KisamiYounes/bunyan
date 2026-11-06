import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { canCreateCommunity } from '@/modules/identity/password'
import { PageHeader } from '@/components/shared/page-header'
import { CommunityForm } from '@/components/communities/community-form'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { buttonStyles } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.communities.createTitle }
}

export default async function NewCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/communities/new`)}`)
  }

  const allowed = canCreateCommunity(viewer)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/communities`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.common.back}
      </Link>

      <PageHeader
        title={dict.communities.createTitle}
        description={dict.communities.createSubtitle}
      />

      {allowed ? (
        <Card>
          <CardContent>
            <CommunityForm
              locale={locale}
              labels={{
                name: dict.communities.name,
                nameHint: dict.communities.nameHint,
                slug: dict.communities.slug,
                slugHint: dict.communities.slugHint,
                description: dict.communities.description,
                visibility: dict.communities.visibility,
                visibilityHint: dict.communities.visibilityHint,
                publicLabel: dict.communities.publicLabel,
                publicHint: dict.communities.publicHint,
                privateLabel: dict.communities.privateLabel,
                privateHint: dict.communities.privateHint,
                topic: dict.communities.topic,
                language: dict.communities.language,
                rules: dict.communities.rules,
                rulesHint: dict.communities.rulesHint,
                submit: dict.communities.create,
                submitting: dict.communities.submitting,
                visibilityLocked: dict.communities.visibilityLocked,
                genericError: dict.errors.generic,
                errors: dict.errors,
                topicOptions: dict.communities.topicOptions,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="warning">
          {viewer.ageBand === 'teen' || viewer.ageBand === 'child'
            ? dict.communities.ownerOnly
            : dict.errors.notAllowed}
        </Alert>
      )}

      <Link href={`/${locale}/communities`} className={buttonStyles('ghost', 'sm')}>
        {dict.common.cancel}
      </Link>
    </div>
  )
}
