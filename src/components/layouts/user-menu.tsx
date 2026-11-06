'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, LayoutDashboard, LogOut, Settings, Shield, User } from 'lucide-react'
import { apiRequest } from '@/components/shared/api-client'
import { cn } from '@/shared/utils/cn'

export interface UserMenuLabels {
  dashboard: string
  profile: string
  settings: string
  admin: string
  signOut: string
  userMenu: string
}

export function UserMenu({
  locale,
  name,
  username,
  isAdmin,
  labels,
}: {
  locale: string
  name: string
  username: string
  isAdmin: boolean
  labels: UserMenuLabels
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function signOut() {
    setBusy(true)
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setBusy(false)
    setOpen(false)
    router.push(`/${locale}`)
    router.refresh()
  }

  const items = [
    { href: `/${locale}/dashboard`, label: labels.dashboard, icon: LayoutDashboard },
    { href: `/${locale}/u/${username}`, label: labels.profile, icon: User },
    { href: `/${locale}/settings`, label: labels.settings, icon: Settings },
    ...(isAdmin ? [{ href: `/${locale}/admin`, label: labels.admin, icon: Shield }] : []),
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={labels.userMenu}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm hover:bg-surface-muted"
      >
        <span className="max-w-32 truncate">{name}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-md"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-muted"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-start text-sm text-danger hover:bg-danger/5 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {labels.signOut}
          </button>
        </div>
      ) : null}
    </div>
  )
}
