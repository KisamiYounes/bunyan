import Link from 'next/link'
import { buttonStyles } from '@/components/ui/button'
import { format } from '@/i18n/dictionaries'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function Pagination({
  basePath,
  page,
  totalItems,
  limit,
  searchParams = {},
  labels,
}: {
  basePath: string
  page: number
  totalItems: number
  limit: number
  searchParams?: Record<string, string | undefined>
  labels: { previous: string; next: string; pageOf: string }
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit))
  if (totalPages <= 1) return null

  function hrefFor(target: number): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value)
    }
    if (target > 1) params.set('page', String(target))
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  return (
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label={labels.pageOf}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonStyles('outline', 'sm')}>
          {labels.previous}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <p className="text-sm text-muted-foreground">
        {format(labels.pageOf, { page, total: totalPages })}
      </p>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={buttonStyles('outline', 'sm')}>
          {labels.next}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  )
}
