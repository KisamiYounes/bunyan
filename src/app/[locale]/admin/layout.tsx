import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Flag, LayoutDashboard, Shield, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { cn } from '@/shared/utils/cn'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.adminTitle }
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`)
  if (viewer.role !== 'admin') redirect(`/${locale}/dashboard`)

  const items = [
    { href: `/${locale}/admin`, label: dict.admin.overview, icon: LayoutDashboard },
    { href: `/${locale}/admin/users`, label: dict.admin.users, icon: Users },
    { href: `/${locale}/admin/communities`, label: dict.admin.communities, icon: Shield },
    { href: `/${locale}/admin/reports`, label: dict.admin.reports, icon: Flag },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {dict.common.administrator}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.admin.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.admin.subtitle}</p>
      </div>

      <nav
        aria-label={dict.admin.title}
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1"
      >
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
