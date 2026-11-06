'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { FieldError, FieldHint, Input, Label } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export interface AuthLabels {
  name: string
  username: string
  email: string
  password: string
  birthYear: string
  birthYearHint: string
  submit: string
  passwordHint: string
  guardianNotice: string
  minorBlocked: string
  haveAccount: string
  loginLink: string
  genericError: string
  errors: Record<string, string>
}

export function RegisterForm({ locale, labels }: { locale: string; labels: AuthLabels }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const birthYearRaw = String(form.get('birthYear') ?? '').trim()

    const result = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: String(form.get('name') ?? ''),
        username: String(form.get('username') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        birthYear: birthYearRaw === '' ? undefined : Number(birthYearRaw),
      }),
    })

    setBusy(false)
    if (!result.ok) {
      const code = result.error.code
      const detail =
        code === 'VALIDATION_ERROR' && Array.isArray(result.error.details)
          ? (result.error.details[0] as { message?: string } | undefined)?.message
          : undefined
      setError(detail ?? errorMessage(code, labels.errors, labels.genericError))
      return
    }

    router.push(`/${locale}/dashboard`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Alert variant="info">{labels.guardianNotice}</Alert>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="name">{labels.name}</Label>
        <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">{labels.username}</Label>
        <Input
          id="username"
          name="username"
          dir="ltr"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
        <FieldHint>{labels.passwordHint}</FieldHint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="birthYear">{labels.birthYear}</Label>
        <Input
          id="birthYear"
          name="birthYear"
          type="number"
          inputMode="numeric"
          min={1900}
          max={new Date().getFullYear()}
          aria-describedby="birthYear-hint"
        />
        <FieldHint>
          <span id="birthYear-hint">{labels.birthYearHint}</span>
        </FieldHint>
      </div>

      <Button type="submit" className="w-full" loading={busy}>
        {labels.submit}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {labels.haveAccount}{' '}
        <Link href={`/${locale}/login`} className="font-medium text-primary hover:underline">
          {labels.loginLink}
        </Link>
      </p>
      <FieldError />
      <p className="text-xs text-muted-foreground">{labels.minorBlocked}</p>
    </form>
  )
}
