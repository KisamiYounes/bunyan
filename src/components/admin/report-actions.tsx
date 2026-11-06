'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, ShieldAlert, X } from 'lucide-react'
import type { ReportStatus } from '@/shared/constants'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export interface AdminReportActionsLabels {
  resolve: string
  dismiss: string
  escalate: string
  updated: string
  genericError: string
  errors: Record<string, string>
}

export function AdminReportActions({
  reportId,
  status,
  labels,
}: {
  reportId: string
  status: ReportStatus
  labels: AdminReportActionsLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (status === 'resolved' || status === 'dismissed') {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  async function run(next: 'resolved' | 'dismissed' | 'escalated') {
    setBusy(next)
    setError(null)
    const result = await apiRequest(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    })
    setBusy(null)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" loading={busy === 'resolved'} onClick={() => run('resolved')}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {labels.resolve}
        </Button>
        <Button
          size="sm"
          variant="outline"
          loading={busy === 'dismissed'}
          onClick={() => run('dismissed')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {labels.dismiss}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={busy === 'escalated'}
          onClick={() => run('escalated')}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          {labels.escalate}
        </Button>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  )
}
