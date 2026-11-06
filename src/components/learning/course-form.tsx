'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { COURSE_LEVELS, TOPICS, type CourseLevel, type Topic } from '@/shared/constants'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { isValidSlug, normalizeSlug } from '@/shared/utils/slug'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'

export interface CourseFormLabels {
  title: string
  summary: string
  summaryHint: string
  description: string
  descriptionHint: string
  slug: string
  slugHint: string
  topic: string
  language: string
  level: string
  submit: string
  submitting: string
  saved: string
  genericError: string
  errors: Record<string, string>
  topicOptions: Record<string, string>
  levelOptions: Record<string, string>
}

export interface CourseFormValues {
  title: string
  slug: string
  summary: string
  description: string
  topic?: Topic
  language: Locale
  level: CourseLevel
}

const emptyValues: CourseFormValues = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  language: 'ar',
  level: 'beginner',
}

export function CourseForm({
  locale,
  mode,
  courseId,
  initial,
  labels,
}: {
  locale: Locale
  mode: 'create' | 'edit'
  courseId?: string
  initial?: CourseFormValues
  labels: CourseFormLabels
}) {
  const router = useRouter()
  const values = initial ?? emptyValues
  const [title, setTitle] = useState(values.title)
  const [slug, setSlug] = useState(values.slug)
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(normalizeSlug(value))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    if (mode === 'create' && !isValidSlug(slug)) {
      setError(labels.slugHint)
      return
    }

    setBusy(true)
    const form = new FormData(event.currentTarget)
    const topic = String(form.get('topic') ?? '')
    const body = {
      title,
      summary: String(form.get('summary') ?? ''),
      description: String(form.get('description') ?? ''),
      topic: topic ? (topic as Topic) : undefined,
      language: String(form.get('language') ?? locale),
      level: String(form.get('level') ?? 'beginner'),
    }

    const result =
      mode === 'create'
        ? await apiRequest<{ courseId: string }>('/api/courses', {
            method: 'POST',
            body: JSON.stringify({ ...body, slug }),
          })
        : await apiRequest(`/api/courses/${courseId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
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

    if (mode === 'create') {
      const data = result.data as { courseId: string }
      router.push(`/${locale}/studio/courses/${data.courseId}`)
      router.refresh()
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {saved ? <Alert variant="success">{labels.saved}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="course-title">{labels.title}</Label>
        <Input
          id="course-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          required
          minLength={3}
          maxLength={140}
          autoComplete="off"
        />
      </div>

      {mode === 'create' ? (
        <div className="space-y-1.5">
          <Label htmlFor="course-slug">{labels.slug}</Label>
          <Input
            id="course-slug"
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
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="course-summary">{labels.summary}</Label>
        <Textarea
          id="course-summary"
          name="summary"
          defaultValue={values.summary}
          required
          minLength={10}
          maxLength={400}
          className="min-h-20"
        />
        <FieldHint>{labels.summaryHint}</FieldHint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-description">{labels.description}</Label>
        <Textarea
          id="course-description"
          name="description"
          defaultValue={values.description}
          required
          minLength={20}
          maxLength={8000}
          className="min-h-40"
        />
        <FieldHint>{labels.descriptionHint}</FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="course-topic">{labels.topic}</Label>
          <Select id="course-topic" name="topic" defaultValue={values.topic ?? ''}>
            <option value="">—</option>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {labels.topicOptions[topic] ?? topic}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="course-language">{labels.language}</Label>
          <Select id="course-language" name="language" defaultValue={values.language}>
            {locales.map((item) => (
              <option key={item} value={item}>
                {localeLabels[item]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="course-level">{labels.level}</Label>
          <Select id="course-level" name="level" defaultValue={values.level}>
            {COURSE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {labels.levelOptions[level] ?? level}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Button type="submit" loading={busy} size="lg">
        {busy ? labels.submitting : labels.submit}
      </Button>
    </form>
  )
}
