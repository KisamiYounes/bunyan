import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Flag, Shield, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { formatDateTime, formatNumber } from '@/shared/utils/format'
import { getAdminStats } from '@/modules/admin/admin.service'
import { listAuditLogs } from '@/modules/admin/audit.service'
import { getUsersByIds } from '@/modules/identity/user.service'
import { Stat } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const [stats, logs] = await Promise.all([getAdminStats(), listAuditLogs(20)])
  const actors = await getUsersByIds([...new Set(logs.map((log) => String(log.actorId)))])

  const sections = [
    {
      href: `/${locale}/admin/users`,
      label: dict.admin.users,
      value: formatNumber(stats.users, locale),
      icon: Users,
    },
    {
      href: `/${locale}/admin/communities`,
      label: dict.admin.communities,
      value: formatNumber(stats.communities, locale),
      icon: Shield,
    },
    {
      href: `/${locale}/admin/reports`,
      label: dict.admin.reports,
      value: formatNumber(stats.openReports, locale),
      icon: Flag,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dict.admin.totalUsers} value={formatNumber(stats.users, locale)} />
        <Stat label={dict.admin.totalCommunities} value={formatNumber(stats.communities, locale)} />
        <Stat label={dict.admin.totalPosts} value={formatNumber(stats.posts, locale)} />
        <Stat label={dict.admin.openReports} value={formatNumber(stats.openReports, locale)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{section.label}</span>
                <span className="block text-lg font-semibold tabular-nums">{section.value}</span>
              </span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.admin.audit}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin.noReports}</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => {
                const actor = actors.get(String(log.actorId))
                return (
                  <li
                    key={String(log._id)}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge variant="neutral">{log.action}</Badge>
                      <span className="truncate text-muted-foreground">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span>{actor?.name ?? dict.common.unknown}</span>
                      <time dateTime={log.createdAt.toISOString()}>
                        {formatDateTime(log.createdAt, locale)}
                      </time>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
