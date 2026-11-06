'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { locales, localeLabels } from '@/i18n/config'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'

export interface ProfileFormLabels {
  name: string
  username: string
  bio: string
  avatarUrl: string
  avatarHint: string
  locale: string
  profileVisibility: string
  visibilityPublic: string
  visibilityMembers: string
  save: string
  saving: string
  saved: string
  genericError: string
  errors: Record<string, string>
}

export function ProfileForm({
  initial,
  labels,
}: {
  initial: {
    name: string
    username: string
    bio: string
    avatarUrl: string
    locale: string
    profileVisibility: 'public' | 'members'
  }
  labels: ProfileFormLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)

    const result = await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: String(form.get('name') ?? ''),
        username: String(form.get('username') ?? ''),
        bio: String(form.get('bio') ?? ''),
        avatarUrl: String(form.get('avatarUrl') ?? '') || undefined,
        locale: String(form.get('locale') ?? 'ar'),
        profileVisibility: String(form.get('profileVisibility') ?? 'public'),
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

    setMessage(labels.saved)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">{labels.name}</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={initial.name}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-username">{labels.username}</Label>
          <Input
            id="profile-username"
            name="username"
            dir="ltr"
            defaultValue={initial.username}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]+"
            autoComplete="username"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-bio">{labels.bio}</Label>
        <Textarea id="profile-bio" name="bio" defaultValue={initial.bio} maxLength={600} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="profile-avatar">{labels.avatarUrl}</Label>
        <Input
          id="profile-avatar"
          name="avatarUrl"
          dir="ltr"
          defaultValue={initial.avatarUrl}
          maxLength={500}
          placeholder="https://…"
        />
        <FieldHint>{labels.avatarHint}</FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-locale">{labels.locale}</Label>
          <Select id="profile-locale" name="locale" defaultValue={initial.locale}>
            {locales.map((item) => (
              <option key={item} value={item}>
                {localeLabels[item]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-visibility">{labels.profileVisibility}</Label>
          <Select
            id="profile-visibility"
            name="profileVisibility"
            defaultValue={initial.profileVisibility}
          >
            <option value="public">{labels.visibilityPublic}</option>
            <option value="members">{labels.visibilityMembers}</option>
          </Select>
        </div>
      </div>

      <Button type="submit" loading={busy}>
        {busy ? labels.saving : labels.save}
      </Button>
    </form>
  )
}
