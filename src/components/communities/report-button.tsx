'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { Flag, X } from 'lucide-react'
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@/shared/constants'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Label, Select, Textarea, FieldError } from '@/components/ui/field'

export interface ReportLabels {
  report: string
  title: string
  subtitle: string
  reason: string
  details: string
  detailsPlaceholder: string
  submit: string
  submitting: string
  cancel: string
  success: string
  genericError: string
  errors: Record<string, string>
  reasons: Record<string, string>
}

export function ReportButton({
  targetType,
  targetId,
  labels,
  className,
}: {
  targetType: ReportTargetType
  targetId: string
  labels: ReportLabels
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? 'other') as ReportReason
    const details = String(form.get('details') ?? '').trim()

    const result = await apiRequest('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        details: details || undefined,
      }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setSuccess(true)
  }

  function close() {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className={className}>
        <Flag className="h-4 w-4" aria-hidden="true" />
        {labels.report}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 id={titleId} className="text-lg font-semibold">
                  {labels.title}
                </h2>
                <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={close} aria-label={labels.cancel}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {success ? (
              <div className="mt-4 space-y-4">
                <Alert variant="success">{labels.success}</Alert>
                <Button onClick={close} className="w-full">
                  {labels.cancel}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                {error ? <Alert variant="danger">{error}</Alert> : null}

                <div className="space-y-1.5">
                  <Label htmlFor="report-reason">{labels.reason}</Label>
                  <Select id="report-reason" name="reason" defaultValue="spam">
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {labels.reasons[reason] ?? reason}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="report-details">{labels.details}</Label>
                  <Textarea
                    id="report-details"
                    name="details"
                    maxLength={1000}
                    placeholder={labels.detailsPlaceholder}
                  />
                  <FieldError />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={close}>
                    {labels.cancel}
                  </Button>
                  <Button type="submit" variant="danger" loading={busy}>
                    {busy ? labels.submitting : labels.submit}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
