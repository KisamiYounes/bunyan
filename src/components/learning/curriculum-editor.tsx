'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { format } from '@/i18n/dictionaries'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Input, Label, Textarea } from '@/components/ui/field'

export interface CurriculumLesson {
  id: string
  title: string
  position: number
  estimatedMinutes: number
  completed: boolean
  content?: string
}

export interface CurriculumModule {
  id: string
  title: string
  summary?: string
  position: number
  lessons: CurriculumLesson[]
}

export interface CurriculumLabels {
  modules: string
  addModule: string
  moduleTitle: string
  addModuleAction: string
  moduleEmpty: string
  moduleEmptyHint: string
  addLesson: string
  lessonTitle: string
  lessonContent: string
  lessonContentHint: string
  estimatedMinutes: string
  addLessonAction: string
  saveChanges: string
  deleteModule: string
  confirmDeleteModule: string
  deleteLesson: string
  confirmDeleteLesson: string
  genericError: string
  errors: Record<string, string>
  durationTemplate: string
}

export function CurriculumEditor({
  courseId,
  modules,
  labels,
}: {
  courseId: string
  modules: CurriculumModule[]
  labels: CurriculumLabels
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setTitle('')
    setAdding(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{labels.modules}</h2>
        <Button variant="secondary" size="sm" onClick={() => setAdding((value) => !value)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {labels.addModule}
        </Button>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {adding ? (
        <form onSubmit={addModule} className="space-y-3 rounded-lg border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-module-title">{labels.moduleTitle}</Label>
            <Input
              id="new-module-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={140}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={busy}>
              {labels.addModuleAction}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              —
            </Button>
          </div>
        </form>
      ) : null}

      {modules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="font-medium">{labels.moduleEmpty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.moduleEmptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <ModuleCard key={module.id} index={index} module={module} labels={labels} />
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleCard({
  index,
  module,
  labels,
}: {
  index: number
  module: CurriculumModule
  labels: CurriculumLabels
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(module.title)
  const [addingLesson, setAddingLesson] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/modules/${module.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(labels.confirmDeleteModule)) return
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/modules/${module.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    router.refresh()
  }

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold">
          {index + 1}
        </span>
        {editing ? (
          <form onSubmit={saveTitle} className="flex flex-1 flex-wrap items-center gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={140}
              className="h-9 max-w-sm flex-1"
              aria-label={labels.moduleTitle}
            />
            <Button type="submit" size="sm" loading={busy}>
              {labels.saveChanges}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              —
            </Button>
          </form>
        ) : (
          <h3 className="flex-1 text-base font-semibold">{module.title}</h3>
        )}
        <div className="flex items-center gap-1">
          {!editing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              aria-label={labels.saveChanges}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            loading={busy}
            className="text-danger"
            aria-label={labels.deleteModule}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        {module.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.moduleEmptyHint}</p>
        ) : (
          <ul className="divide-y divide-border">
            {module.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} labels={labels} />
            ))}
          </ul>
        )}

        {addingLesson ? (
          <LessonForm
            moduleId={module.id}
            labels={labels}
            onDone={() => {
              setAddingLesson(false)
              router.refresh()
            }}
            onCancel={() => setAddingLesson(false)}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAddingLesson(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {labels.addLesson}
          </Button>
        )}
      </div>
    </section>
  )
}

function LessonRow({ lesson, labels }: { lesson: CurriculumLesson; labels: CurriculumLabels }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [content, setContent] = useState(lesson.content ?? '')
  const [minutes, setMinutes] = useState(lesson.estimatedMinutes)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title,
        estimatedMinutes: Number(minutes),
        ...(lesson.content !== undefined ? { content } : {}),
      }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(labels.confirmDeleteLesson)) return
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/lessons/${lesson.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    router.refresh()
  }

  if (editing) {
    return (
      <li className="py-3">
        <form onSubmit={save} className="space-y-3">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <div className="space-y-1.5">
            <Label htmlFor={`lesson-title-${lesson.id}`}>{labels.lessonTitle}</Label>
            <Input
              id={`lesson-title-${lesson.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={180}
            />
          </div>
          {lesson.content !== undefined ? (
            <div className="space-y-1.5">
              <Label htmlFor={`lesson-content-${lesson.id}`}>{labels.lessonContent}</Label>
              <Textarea
                id={`lesson-content-${lesson.id}`}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                maxLength={60000}
                className="min-h-40"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`lesson-minutes-${lesson.id}`}>{labels.estimatedMinutes}</Label>
            <Input
              id={`lesson-minutes-${lesson.id}`}
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={busy}>
              {labels.saveChanges}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              —
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{lesson.title}</span>
        <span className="text-xs text-muted-foreground">
          {format(labels.durationTemplate, { count: lesson.estimatedMinutes })}
        </span>
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
        aria-label={labels.saveChanges}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        loading={busy}
        className="text-danger"
        aria-label={labels.deleteLesson}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  )
}

function LessonForm({
  moduleId,
  labels,
  onDone,
  onCancel,
}: {
  moduleId: string
  labels: CurriculumLabels
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({ title, content, estimatedMinutes: Number(minutes) }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-border p-3">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="space-y-1.5">
        <Label htmlFor={`new-lesson-title-${moduleId}`}>{labels.lessonTitle}</Label>
        <Input
          id={`new-lesson-title-${moduleId}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          maxLength={180}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`new-lesson-content-${moduleId}`}>{labels.lessonContent}</Label>
        <Textarea
          id={`new-lesson-content-${moduleId}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          maxLength={60000}
          className="min-h-32"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`new-lesson-minutes-${moduleId}`}>{labels.estimatedMinutes}</Label>
        <Input
          id={`new-lesson-minutes-${moduleId}`}
          type="number"
          min={1}
          max={600}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          className="w-32"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={busy}>
          {labels.addLessonAction}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          —
        </Button>
      </div>
    </form>
  )
}
