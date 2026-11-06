import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { getDictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import { PageHeader } from '@/components/shared/page-header'
import { buttonStyles } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

/**
 * Server-rendered fallback for learners who reach a studio route directly.
 * Authoring is enforced again in every service call; this only explains the rule.
 */
export function StudioAuthorOnly({
  locale,
  title,
  description,
}: {
  locale: Locale
  title?: string
  description?: string
}) {
  const dict = getDictionary(locale)
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.nav.studio}
        title={title ?? dict.studio.title}
        description={description ?? dict.studio.subtitle}
      />
      <Alert variant="warning">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">{dict.studio.authorOnly}</p>
            <p className="text-sm text-muted-foreground">{dict.studio.authorOnlyHint}</p>
          </div>
        </div>
      </Alert>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${locale}/courses`} className={buttonStyles('primary', 'md')}>
          {dict.courses.title}
        </Link>
        <Link href={`/${locale}/publications`} className={buttonStyles('outline', 'md')}>
          {dict.publications.title}
        </Link>
      </div>
    </div>
  )
}
