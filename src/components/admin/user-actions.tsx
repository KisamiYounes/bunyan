'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RotateCcw, UserX } from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export interface AdminUserActionsLabels {
  suspend: string
  restore: string
  suspended: string
  restored: string
  genericError: string
  errors: Record<string, string>
}

export function AdminUserActions({
  userId,
  status,
  labels,
}: {
  userId: string
  status: 'active' | 'suspended' | 'deleted'
  labels: AdminUserActionsLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'deleted') return <span className="text-xs text-muted-foreground">—</span>

  const action = status === 'active' ? 'suspend' : 'restore'

  async function run() {
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/admin/users/${userId}`, {
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
        variant={action === 'suspend' ? 'danger' : 'outline'}
        loading={busy}
        onClick={run}
        title={action === 'suspend' ? labels.suspend : labels.restore}
      >
        {action === 'suspend' ? (
          <UserX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        )}
        {action === 'suspend' ? labels.suspend : labels.restore}
      </Button>
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  )
}
