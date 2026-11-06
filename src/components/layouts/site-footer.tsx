import Link from 'next/link'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import { format } from '@/i18n/dictionaries'

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold">{dict.common.appName}</p>
          <p className="text-sm text-muted-foreground">{dict.common.tagline}</p>
          <p className="text-sm text-muted-foreground">{dict.footer.madeWith}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label={dict.footer.about}>
          <Link href={`/${locale}`} className="text-muted-foreground hover:text-foreground">
            {dict.common.home}
          </Link>
          <Link
            href={`/${locale}/communities`}
            className="text-muted-foreground hover:text-foreground"
          >
            {dict.nav.communities}
          </Link>
          <Link href={`/${locale}/login`} className="text-muted-foreground hover:text-foreground">
            {dict.common.signIn}
          </Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          {format(dict.footer.rights, { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
