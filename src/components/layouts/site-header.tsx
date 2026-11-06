import Link from 'next/link'
import { LogIn, UserPlus } from 'lucide-react'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import type { SessionUser } from '@/modules/identity/dto'
import { canAuthorLearning } from '@/modules/identity/authorization'
import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { UserMenu } from './user-menu'

export function SiteHeader({
  locale,
  dict,
  user,
}: {
  locale: Locale
  dict: Dictionary
  user: SessionUser | null
}) {
  const nav = [
    { href: `/${locale}/communities`, label: dict.nav.communities },
    { href: `/${locale}/courses`, label: dict.nav.courses },
    { href: `/${locale}/publications`, label: dict.nav.publications },
    { href: `/${locale}/search`, label: dict.common.search },
    ...(user ? [{ href: `/${locale}/library`, label: dict.nav.library }] : []),
    ...(canAuthorLearning(user) ? [{ href: `/${locale}/studio`, label: dict.nav.studio }] : []),
    ...(user ? [{ href: `/${locale}/dashboard`, label: dict.nav.dashboard }] : []),
    ...(user?.role === 'admin' ? [{ href: `/${locale}/admin`, label: dict.nav.admin }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-lg font-semibold text-primary-foreground"
          >
            ب
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold">{dict.common.appName}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {dict.common.tagline}
            </span>
          </span>
        </Link>

        <nav
          aria-label={dict.common.home}
          className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <ThemeToggle label={dict.a11y.toggleTheme} />
          <LanguageSwitcher locale={locale} label={dict.a11y.changeLanguage} />
          {user ? (
            <UserMenu
              locale={locale}
              name={user.name}
              username={user.username}
              isAdmin={user.role === 'admin'}
              labels={{
                dashboard: dict.common.dashboard,
                profile: dict.common.profile,
                settings: dict.common.settings,
                admin: dict.common.admin,
                signOut: dict.common.signOut,
                userMenu: dict.a11y.userMenu,
              }}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href={`/${locale}/login`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-surface-muted"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {dict.common.signIn}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {dict.common.signUp}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
