'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export interface LoginLabels {
  email: string
  password: string
  submit: string
  noAccount: string
  registerLink: string
  genericError: string
  errors: Record<string, string>
}

export function LoginForm({
  locale,
  labels,
  next,
}: {
  locale: string
  labels: LoginLabels
  next?: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const form = new FormData(event.currentTarget)

    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    })

    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }

    const target = next && next.startsWith(`/${locale}/`) ? next : `/${locale}/dashboard`
    router.push(target)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" className="w-full" loading={busy}>
        {labels.submit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {labels.noAccount}{' '}
        <Link href={`/${locale}/register`} className="font-medium text-primary hover:underline">
          {labels.registerLink}
        </Link>
      </p>
    </form>
  )
}
