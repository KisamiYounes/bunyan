import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { REPORT_STATUSES, type ReportStatus } from '@/shared/constants'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { formatDateTime } from '@/shared/utils/format'
import { listReports } from '@/modules/admin/report.service'
import { AdminReportActions } from '@/components/admin/report-actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/shared/utils/cn'

export default async function AdminReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const query = await searchParams

  const status =
    query.status && (REPORT_STATUSES as readonly string[]).includes(query.status)
      ? (query.status as ReportStatus)
      : undefined

  const reports = await listReports(status)

  const filters: Array<{ value?: ReportStatus; label: string }> = [
    { label: dict.common.all },
    { value: 'open', label: dict.admin.reportOpen },
    { value: 'escalated', label: dict.admin.reportEscalated },
    { value: 'resolved', label: dict.admin.reportResolved },
    { value: 'dismissed', label: dict.admin.reportDismissed },
  ]

  function statusBadge(value: ReportStatus) {
    if (value === 'open') return <Badge variant="warning">{dict.admin.reportOpen}</Badge>
    if (value === 'escalated') return <Badge variant="danger">{dict.admin.reportEscalated}</Badge>
    if (value === 'resolved') return <Badge variant="success">{dict.admin.reportResolved}</Badge>
    return <Badge variant="neutral">{dict.admin.reportDismissed}</Badge>
  }

  function reasonLabel(reason: string): string {
    const reasons = dict.posts.reasons as Record<string, string>
    return reasons[reason] ?? reason
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const active = filter.value === status
          const href = filter.value
            ? `/${locale}/admin/reports?status=${filter.value}`
            : `/${locale}/admin/reports`
          return (
            <Link
              key={filter.label}
              href={href}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                active
                  ? 'border-primary bg-primary/5 font-medium text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted',
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{dict.admin.noReports}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Card>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {statusBadge(report.status)}
                      <Badge variant="neutral">{report.targetType}</Badge>
                      <Badge variant="neutral">{reasonLabel(report.reason)}</Badge>
                    </div>
                    <time dateTime={report.createdAt} className="text-xs text-muted-foreground">
                      {formatDateTime(report.createdAt, locale)}
                    </time>
                  </div>

                  <div className="space-y-1">
                    {report.targetHref ? (
                      <Link
                        href={`/${locale}${report.targetHref}`}
                        className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
                      >
                        {report.targetLabel}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="font-medium">{report.targetLabel}</p>
                    )}
                    {report.details ? (
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {report.details}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {dict.admin.reportedBy}{' '}
                      {report.reporter ? (
                        <Link
                          href={`/${locale}/u/${report.reporter.username}`}
                          className="hover:underline"
                        >
                          {report.reporter.name}
                        </Link>
                      ) : (
                        dict.common.unknown
                      )}
                    </p>
                  </div>

                  <AdminReportActions
                    reportId={report.id}
                    status={report.status}
                    labels={{
                      resolve: dict.admin.resolve,
                      dismiss: dict.admin.dismiss,
                      escalate: dict.admin.escalate,
                      updated: dict.admin.reportUpdated,
                      genericError: dict.errors.generic,
                      errors: dict.errors,
                    }}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
