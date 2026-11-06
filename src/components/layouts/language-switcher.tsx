'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/i18n/config'

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname()
  const router = useRouter()

  function change(next: string) {
    if (next === locale) return
    const segments = pathname.split('/')
    if (segments[1] && (locales as readonly string[]).includes(segments[1])) {
      segments[1] = next
    } else {
      segments.splice(1, 0, next)
    }
    document.cookie = `bunyan_locale=${next}; path=/; max-age=31536000; samesite=lax`
    router.push(segments.join('/') || `/${next}`)
    router.refresh()
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => change(event.target.value)}
        aria-label={label}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  )
}
