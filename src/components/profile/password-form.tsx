'use client'

import { useState, type FormEvent } from 'react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Input, Label } from '@/components/ui/field'

export interface PasswordFormLabels {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
  submit: string
  submitting: string
  success: string
  genericError: string
  errors: Record<string, string>
}

export function PasswordForm({ labels }: { labels: PasswordFormLabels }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)

    const result = await apiRequest('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword') ?? ''),
        newPassword: String(form.get('newPassword') ?? ''),
        confirmPassword: String(form.get('confirmPassword') ?? ''),
      }),
    })
    setBusy(false)

    if (!result.ok) {
      if (result.error.code === 'VALIDATION_ERROR' && Array.isArray(result.error.details)) {
        const first = result.error.details[0] as { message?: string } | undefined
        if (first?.message) {
          setError(first.message)
          return
        }
      }
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }

    event.currentTarget.reset()
    setMessage(labels.success)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="current-password">{labels.currentPassword}</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{labels.newPassword}</Label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-new-password">{labels.confirmNewPassword}</Label>
          <Input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </div>
      </div>

      <Button type="submit" variant="outline" loading={busy}>
        {busy ? labels.submitting : labels.submit}
      </Button>
    </form>
  )
}
