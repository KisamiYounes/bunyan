'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Heart, MessageSquare, Send, Trash2 } from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/shared/utils/cn'

interface ErrorLabels {
  genericError: string
  errors: Record<string, string>
}

function messageFor(result: { code: string }, labels: ErrorLabels): string {
  return errorMessage(result.code, labels.errors, labels.genericError)
}

export function JoinButton({
  locale,
  communityId,
  visibility,
  status,
  isOwner,
  authenticated,
  labels,
}: {
  locale: string
  communityId: string
  visibility: 'public' | 'private'
  status: 'active' | 'pending' | 'banned' | 'left' | null
  isOwner: boolean
  authenticated: boolean
  labels: {
    join: string
    requestJoin: string
    joined: string
    pending: string
    leave: string
    joinSuccess: string
    requestSuccess: string
    leaveSuccess: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!authenticated) {
    return (
      <Link href={`/${locale}/login`} className={buttonStyles('primary', 'sm')}>
        {visibility === 'private' ? labels.requestJoin : labels.join}
      </Link>
    )
  }

  if (isOwner) return <Badge variant="accent">{labels.joined}</Badge>
  if (status === 'pending') return <Badge variant="warning">{labels.pending}</Badge>

  async function act(action: 'join' | 'leave') {
    setBusy(true)
    setError(null)
    setMessage(null)
    const result = await apiRequest(`/api/communities/${communityId}/${action}`, { method: 'POST' })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    const data = result.data as { status?: string }
    setMessage(
      action === 'leave'
        ? labels.leaveSuccess
        : data.status === 'pending'
          ? labels.requestSuccess
          : labels.joinSuccess,
    )
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        {status === 'active' ? (
          <Button variant="outline" size="sm" loading={busy} onClick={() => act('leave')}>
            {labels.leave}
          </Button>
        ) : (
          <Button size="sm" loading={busy} onClick={() => act('join')}>
            {visibility === 'private' ? labels.requestJoin : labels.join}
          </Button>
        )}
        {status === 'active' ? <Badge variant="success">{labels.joined}</Badge> : null}
      </div>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function PostComposer({
  communityId,
  labels,
}: {
  communityId: string
  labels: {
    titlePlaceholder: string
    postPlaceholder: string
    publish: string
    posting: string
    success: string
    titleLabel: string
    bodyLabel: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(false)
    const form = new FormData(event.currentTarget)
    const result = await apiRequest(`/api/communities/${communityId}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        title: String(form.get('title') ?? '') || undefined,
        body: String(form.get('body') ?? ''),
      }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    event.currentTarget.reset()
    setSuccess(true)
    router.refresh()
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{labels.success}</Alert> : null}
      <div className="space-y-1.5">
        <Label htmlFor="post-title" className="sr-only">
          {labels.titleLabel}
        </Label>
        <Input id="post-title" name="title" placeholder={labels.titlePlaceholder} maxLength={160} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="post-body" className="sr-only">
          {labels.bodyLabel}
        </Label>
        <Textarea
          id="post-body"
          name="body"
          placeholder={labels.postPlaceholder}
          required
          maxLength={10000}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          <Send className="h-4 w-4 rtl:scale-x-[-1]" aria-hidden="true" />
          {busy ? labels.posting : labels.publish}
        </Button>
      </div>
    </form>
  )
}

export function LikeButton({
  postId,
  liked,
  count,
  labels,
}: {
  postId: string
  liked: boolean
  count: number
  labels: { like: string; liked: string } & ErrorLabels
}) {
  const router = useRouter()
  const [state, setState] = useState({ liked, count })
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    setBusy(true)
    const result = await apiRequest<{ liked: boolean; likeCount: number }>(
      `/api/posts/${postId}/like`,
      {
        method: 'POST',
      },
    )
    setBusy(false)
    if (result.ok) {
      setState({ liked: result.data.liked, count: result.data.likeCount })
    } else {
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={state.liked}
      aria-label={state.liked ? labels.liked : labels.like}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-muted',
        state.liked ? 'text-danger' : 'text-muted-foreground',
      )}
    >
      <Heart className={cn('h-4 w-4', state.liked && 'fill-current')} aria-hidden="true" />
      <span>{state.count}</span>
    </button>
  )
}

export function DeletePostButton({
  postId,
  redirectTo,
  labels,
}: {
  postId: string
  redirectTo?: string
  labels: { deletePost: string; confirmDeletePost: string; genericError: string } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!window.confirm(labels.confirmDeletePost)) return
    setBusy(true)
    setError(null)
    const result = await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    if (redirectTo) {
      router.push(redirectTo)
    } else {
      router.refresh()
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant="ghost" size="sm" onClick={remove} loading={busy} className="text-danger">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {labels.deletePost}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  )
}

export function DeleteCommentButton({
  commentId,
  labels,
}: {
  commentId: string
  labels: { deletePost: string } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm(labels.deletePost)) return
    setBusy(true)
    const result = await apiRequest(`/api/comments/${commentId}`, { method: 'DELETE' })
    setBusy(false)
    if (!result.ok) {
      window.alert(messageFor(result.error, labels))
      return
    }
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={remove} loading={busy} className="text-danger">
      <Trash2 className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{labels.deletePost}</span>
    </Button>
  )
}

export function CommentForm({
  postId,
  labels,
}: {
  postId: string
  labels: {
    placeholder: string
    submit: string
    submitting: string
    success: string
    label: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const result = await apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: String(form.get('body') ?? '') }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    event.currentTarget.reset()
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Label htmlFor="comment-body">{labels.label}</Label>
      <Textarea
        id="comment-body"
        name="body"
        placeholder={labels.placeholder}
        required
        maxLength={3000}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={busy}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {busy ? labels.submitting : labels.submit}
        </Button>
      </div>
    </form>
  )
}
