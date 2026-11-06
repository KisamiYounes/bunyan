'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Archive, Upload } from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export function ManageActions({
  kind,
  id,
  status,
  canPublish,
  labels,
}: {
  kind: 'course' | 'publication'
  id: string
  status: 'draft' | 'published' | 'archived'
  canPublish: boolean
  labels: {
    publish: string
    publishing: string
    archive: string
    archiving: string
    confirmArchive: string
    publishBlocked: string
    publishedSuccess: string
    archivedSuccess: string
    genericError: string
    errors: Record<string, string>
  }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'archive' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function publish() {
    setBusy('publish')
    setError(null)
    setMessage(null)
    const result = await apiRequest(
      `/api/${kind === 'course' ? 'courses' : 'publications'}/${id}/publish`,
      {
        method: 'POST',
      },
    )
    setBusy(null)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setMessage(labels.publishedSuccess)
    router.refresh()
  }

  async function archive() {
    if (!window.confirm(labels.confirmArchive)) return
    setBusy('archive')
    setError(null)
    setMessage(null)
    const result = await apiRequest(
      `/api/${kind === 'course' ? 'courses' : 'publications'}/${id}`,
      {
        method: 'DELETE',
      },
    )
    setBusy(null)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setMessage(labels.archivedSuccess)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'draft' ? (
          canPublish ? (
            <Button size="sm" loading={busy === 'publish'} onClick={publish}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {busy === 'publish' ? labels.publishing : labels.publish}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{labels.publishBlocked}</p>
          )
        ) : null}
        {status !== 'archived' ? (
          <Button variant="outline" size="sm" loading={busy === 'archive'} onClick={archive}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            {busy === 'archive' ? labels.archiving : labels.archive}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  )
}
