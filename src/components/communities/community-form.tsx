'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Globe, Lock } from 'lucide-react'
import { TOPICS, type Topic } from '@/shared/constants'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { normalizeSlug, isValidSlug } from '@/shared/utils/slug'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'
import { cn } from '@/shared/utils/cn'

export interface CommunityFormLabels {
  name: string
  nameHint: string
  slug: string
  slugHint: string
  description: string
  visibility: string
  visibilityHint: string
  publicLabel: string
  publicHint: string
  privateLabel: string
  privateHint: string
  topic: string
  language: string
  rules: string
  rulesHint: string
  submit: string
  submitting: string
  visibilityLocked: string
  genericError: string
  errors: Record<string, string>
  topicOptions: Record<string, string>
}

interface CommunityResponse {
  community: { slug: string }
}

export function CommunityForm({ locale, labels }: { locale: Locale; labels: CommunityFormLabels }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(normalizeSlug(value))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!isValidSlug(slug)) {
      setError(labels.slugHint)
      return
    }

    setBusy(true)
    const form = new FormData(event.currentTarget)
    const topic = String(form.get('topic') ?? '')
    const result = await apiRequest<CommunityResponse>('/api/communities', {
      method: 'POST',
      body: JSON.stringify({
        name,
        slug,
        description: String(form.get('description') ?? ''),
        visibility,
        topic: topic ? (topic as Topic) : undefined,
        language: String(form.get('language') ?? locale),
        rules: String(form.get('rules') ?? '') || undefined,
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

    router.push(`/${locale}/communities/${result.data.community.slug}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="community-name">{labels.name}</Label>
        <Input
          id="community-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          minLength={3}
          maxLength={80}
          autoComplete="off"
        />
        <FieldHint>{labels.nameHint}</FieldHint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="community-slug">{labels.slug}</Label>
        <Input
          id="community-slug"
          dir="ltr"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true)
            setSlug(normalizeSlug(event.target.value))
          }}
          required
          minLength={3}
          maxLength={60}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          autoComplete="off"
          className="font-mono"
        />
        <FieldHint>{labels.slugHint}</FieldHint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="community-description">{labels.description}</Label>
        <Textarea
          id="community-description"
          name="description"
          required
          minLength={10}
          maxLength={1000}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{labels.visibility}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['public', 'private'] as const).map((option) => {
            const Icon = option === 'public' ? Globe : Lock
            const active = visibility === option
            return (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:bg-surface-muted/50',
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={active}
                  onChange={() => setVisibility(option)}
                  className="mt-1"
                />
                <span className="space-y-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {option === 'public' ? labels.publicLabel : labels.privateLabel}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option === 'public' ? labels.publicHint : labels.privateHint}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <FieldHint>{labels.visibilityHint}</FieldHint>
        <FieldHint>{labels.visibilityLocked}</FieldHint>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="community-topic">{labels.topic}</Label>
          <Select id="community-topic" name="topic" defaultValue="">
            <option value="">—</option>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {labels.topicOptions[topic] ?? topic}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="community-language">{labels.language}</Label>
          <Select id="community-language" name="language" defaultValue={locale}>
            {locales.map((item) => (
              <option key={item} value={item}>
                {localeLabels[item]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="community-rules">{labels.rules}</Label>
        <Textarea id="community-rules" name="rules" maxLength={4000} />
        <FieldHint>{labels.rulesHint}</FieldHint>
      </div>

      <Button type="submit" loading={busy} size="lg">
        {busy ? labels.submitting : labels.submit}
      </Button>
    </form>
  )
}
