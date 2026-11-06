export const locales = ['ar', 'en', 'fr'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ar'

export const localeLabels: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
}

export const localeDirections: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
  fr: 'ltr',
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return localeDirections[locale]
}

export function localizePath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/') return `/${locale}`
  return `/${locale}${normalized}`
}

export function stripLocale(pathname: string): string {
  const segments = pathname.split('/')
  const maybeLocale = segments[1]
  if (maybeLocale && isLocale(maybeLocale)) {
    const rest = segments.slice(2).join('/')
    return rest ? `/${rest}` : '/'
  }
  return pathname
}
