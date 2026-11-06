'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { apiRequest, errorMessage } from '@/components/shared/api-client'
import { Button, buttonStyles } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ErrorLabels {
  genericError: string
  errors: Record<string, string>
}

function messageFor(result: { code: string }, labels: ErrorLabels): string {
  return errorMessage(result.code, labels.errors, labels.genericError)
}

export function EnrollButton({
  locale,
  courseId,
  courseSlug,
  authenticated,
  enrolled,
  continueLessonId,
  labels,
}: {
  locale: string
  courseId: string
  courseSlug: string
  authenticated: boolean
  enrolled: boolean
  continueLessonId?: string
  labels: {
    enroll: string
    enrolling: string
    enrolled: string
    continueLearning: string
    startLearning: string
    signInToEnroll: string
    enrollmentSuccess: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!authenticated) {
    return (
      <div className="space-y-2">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/courses/${courseSlug}`)}`}
          className={buttonStyles('primary', 'md')}
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          {labels.startLearning}
        </Link>
        <p className="text-xs text-muted-foreground">{labels.signInToEnroll}</p>
      </div>
    )
  }

  if (enrolled) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {continueLessonId ? (
          <Link
            href={`/${locale}/courses/${courseSlug}/lessons/${continueLessonId}`}
            className={buttonStyles('primary', 'md')}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            {labels.continueLearning}
          </Link>
        ) : null}
        <Badge variant="success">{labels.enrolled}</Badge>
      </div>
    )
  }

  async function enroll() {
    setBusy(true)
    setError(null)
    setSuccess(false)
    const result = await apiRequest(`/api/courses/${courseId}/enroll`, { method: 'POST' })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button size="md" loading={busy} onClick={enroll}>
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {busy ? labels.enrolling : labels.enroll}
      </Button>
      {success ? <p className="text-xs text-success">{labels.enrollmentSuccess}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function CompleteLessonButton({
  lessonId,
  completed,
  labels,
}: {
  lessonId: string
  completed: boolean
  labels: {
    complete: string
    completing: string
    completed: string
    lessonCompleted: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (completed) {
    return (
      <Badge variant="success" className="gap-1.5 px-3 py-1 text-sm">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {labels.completed}
      </Badge>
    )
  }

  async function complete() {
    setBusy(true)
    setError(null)
    setSuccess(false)
    const result = await apiRequest(`/api/lessons/${lessonId}/complete`, { method: 'POST' })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Button size="md" loading={busy} onClick={complete}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {busy ? labels.completing : labels.complete}
      </Button>
      {success ? <p className="text-xs text-success">{labels.lessonCompleted}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function BookmarkButton({
  targetType,
  targetId,
  initialBookmarked,
  authenticated,
  locale,
  labels,
}: {
  targetType: 'course' | 'publication'
  targetId: string
  initialBookmarked: boolean
  authenticated: boolean
  locale: string
  labels: {
    bookmark: string
    bookmarked: string
    signIn: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authenticated) {
    return (
      <Link
        href={`/${locale}/login`}
        className={buttonStyles('outline', 'sm')}
        aria-label={labels.bookmark}
      >
        <Bookmark className="h-4 w-4" aria-hidden="true" />
        {labels.signIn}
      </Link>
    )
  }

  async function toggle() {
    setBusy(true)
    setError(null)
    const result = await apiRequest<{ bookmarked: boolean }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    setBookmarked(result.data.bookmarked)
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <Button
        variant={bookmarked ? 'secondary' : 'outline'}
        size="sm"
        loading={busy}
        onClick={toggle}
        aria-pressed={bookmarked}
      >
        {bookmarked ? (
          <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        )}
        {bookmarked ? labels.bookmarked : labels.bookmark}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  authenticated,
  locale,
  labels,
}: {
  targetType: 'course' | 'publication'
  targetId: string
  initialFollowing: boolean
  authenticated: boolean
  locale: string
  labels: {
    follow: string
    following: string
    signIn: string
  } & ErrorLabels
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authenticated) {
    return (
      <Link
        href={`/${locale}/login`}
        className={buttonStyles('outline', 'sm')}
        aria-label={labels.follow}
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {labels.signIn}
      </Link>
    )
  }

  async function toggle() {
    setBusy(true)
    setError(null)
    const result = await apiRequest<{ following: boolean }>('/api/follows', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(messageFor(result.error, labels))
      return
    }
    setFollowing(result.data.following)
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <Button
        variant={following ? 'secondary' : 'outline'}
        size="sm"
        loading={busy}
        onClick={toggle}
        aria-pressed={following}
      >
        {following ? (
          <UserCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        )}
        {following ? labels.following : labels.follow}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}

export function ReadingTracker({
  publicationId,
  chapterId,
  initialScroll,
  authenticated,
  labels,
}: {
  publicationId: string
  chapterId: string
  initialScroll: number
  authenticated: boolean
  labels: { resumedAt: string; signInToSave: string }
}) {
  const restoredRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Restore the saved position once, then persist a debounced scroll fraction while reading.
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (initialScroll > 0 && !restoredRef.current) {
      restoredRef.current = true
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) window.scrollTo({ top: max * initialScroll, behavior: 'auto' })
    }

    if (!authenticated) return

    let timer: ReturnType<typeof setTimeout> | undefined
    function fraction(): number {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return 0
      return Math.min(1, Math.max(0, window.scrollY / max))
    }

    function persist() {
      void fetch(`/api/publications/${publicationId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ chapterId, scroll: Number(fraction().toFixed(4)) }),
        keepalive: true,
      })
        .then((response) => setStatus(response.ok ? 'saved' : 'error'))
        .catch(() => setStatus('error'))
    }

    function onScroll() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(persist, 800)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timer) clearTimeout(timer)
    }
  }, [authenticated, chapterId, initialScroll, publicationId])

  return (
    <div className="text-xs text-muted-foreground" aria-live="polite">
      {!authenticated ? (
        <span>{labels.signInToSave}</span>
      ) : status === 'saved' || (initialScroll > 0 && status === 'idle') ? (
        <span>{labels.resumedAt}</span>
      ) : null}
    </div>
  )
}
