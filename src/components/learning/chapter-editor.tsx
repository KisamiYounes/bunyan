'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button, buttonStyles } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Input, Label, Textarea } from '@/components/ui/field'

export interface ChapterRow {
  id: string
  title: string
  position: number
  status: 'draft' | 'published'
  content?: string
}

export interface ChapterLabels {
  addChapter: string
  chapterTitle: string
  chapterContent: string
  addChapterAction: string
  chapterEmpty: string
  chapterEmptyHint: string
  publishChapter: string
  unpublishChapter: string
  chapterDraft: string
  chapterPublished: string
  deleteChapter: string
  confirmDeleteChapter: string
  saveChanges: string
  open: string
  genericError: string
  errors: Record<string, string>
}

export function ChapterEditor({
  locale,
  publicationId,
  publicationSlug,
  chapters,
  labels,
}: {
  locale: string
  publicationId: string
  publicationSlug: string
  chapters: ChapterRow[]
  labels: ChapterLabels
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/publications/${publicationId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    setTitle('')
    setContent('')
    setAdding(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{labels.addChapter}</h2>
        <Button variant="secondary" size="sm" onClick={() => setAdding((value) => !value)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {labels.addChapter}
        </Button>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {adding ? (
        <form onSubmit={addChapter} className="space-y-3 rounded-lg border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-chapter-title">{labels.chapterTitle}</Label>
            <Input
              id="new-chapter-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={180}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-chapter-content">{labels.chapterContent}</Label>
            <Textarea
              id="new-chapter-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              maxLength={80000}
              className="min-h-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={busy}>
              {labels.addChapterAction}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              —
            </Button>
          </div>
        </form>
      ) : null}

      {chapters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="font-medium">{labels.chapterEmpty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.chapterEmptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {chapters.map((chapter, index) => (
            <ChapterRowItem
              key={chapter.id}
              locale={locale}
              index={index}
              publicationSlug={publicationSlug}
              chapter={chapter}
              labels={labels}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ChapterRowItem({
  locale,
  index,
  publicationSlug,
  chapter,
  labels,
}: {
  locale: string
  index: number
  publicationSlug: string
  chapter: ChapterRow
  labels: ChapterLabels
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [content, setContent] = useState(chapter.content ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function patch(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/chapters/${chapter.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return false
    }
    router.refresh()
    return true
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ok = await patch({
      title,
      ...(chapter.content !== undefined ? { content } : {}),
    })
    if (ok) setEditing(false)
  }

  async function remove() {
    if (!window.confirm(labels.confirmDeleteChapter)) return
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/chapters/${chapter.id}`, { method: 'DELETE' })
    setBusy(false)
    if (!result.ok) {
      setError(errorMessage(result.error.code, labels.errors, labels.genericError))
      return
    }
    router.refresh()
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{chapter.title}</span>
          <Badge variant={chapter.status === 'published' ? 'success' : 'neutral'} className="mt-1">
            {chapter.status === 'published' ? labels.chapterPublished : labels.chapterDraft}
          </Badge>
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={`/${locale}/publications/${publicationSlug}/chapters/${chapter.id}`}
            className={buttonStyles('ghost', 'sm')}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {labels.open}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setEditing((value) => !value)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onClick={() =>
              patch({ status: chapter.status === 'published' ? 'draft' : 'published' })
            }
          >
            {chapter.status === 'published' ? labels.unpublishChapter : labels.publishChapter}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            loading={busy}
            className="text-danger"
            aria-label={labels.deleteChapter}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-3">
          <Alert variant="danger">{error}</Alert>
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor={`chapter-title-${chapter.id}`}>{labels.chapterTitle}</Label>
            <Input
              id={`chapter-title-${chapter.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={180}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`chapter-content-${chapter.id}`}>{labels.chapterContent}</Label>
            <Textarea
              id={`chapter-content-${chapter.id}`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              maxLength={80000}
              className="min-h-48"
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
      ) : null}
    </li>
  )
}
