'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export interface AdminCommunityActionsLabels {
  archive: string
  activate: string
  archived: string
  genericError: string
  errors: Record<string, string>
}

export function AdminCommunityActions({
  communityId,
  status,
  labels,
}: {
  communityId: string
  status: 'active' | 'archived' | 'suspended'
  labels: AdminCommunityActionsLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const action = status === 'active' ? 'archive' : 'activate'

  async function run() {
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/admin/communities/${communityId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        loading={busy}
        onClick={run}
        title={action === 'archive' ? labels.archive : labels.activate}
      >
        {action === 'archive' ? (
          <Archive className="h-4 w-4" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        )}
        {action === 'archive' ? labels.archive : labels.activate}
      </Button>
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  )
}
