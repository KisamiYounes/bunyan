import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, PlayCircle } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { getCourseBySlug, getLessonForViewer } from '@/modules/learning/course.service'
import { CompleteLessonButton } from '@/components/learning/actions'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.coursesTitle }
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') return code
  }
  return ''
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; lessonId: string }>
}) {
  const { locale, slug, lessonId } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  const course = await getCourseBySlug(slug, viewer).catch(() => null)
  if (!course) notFound()

  let lesson
  try {
    lesson = await getLessonForViewer(slug, lessonId, viewer)
  } catch (error) {
    const code = errorCode(error)
    if (code === 'NOT_ENROLLED') {
      const firstLessonId = course.modules.flatMap((module) => module.lessons)[0]?.id
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href={`/${locale}/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {dict.courses.backToCourse}
          </Link>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-warning" aria-hidden="true" />
                <h1 className="text-xl font-semibold">{course.title}</h1>
              </div>
              <Alert variant="info">{dict.courses.requiresEnrollment}</Alert>
              <p className="text-sm text-muted-foreground">
                {viewer ? dict.courses.requiresEnrollment : dict.courses.signInToEnroll}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/${locale}/courses/${slug}`} className={buttonStyles('primary', 'md')}>
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {viewer ? dict.courses.enroll : dict.courses.startLearning}
                </Link>
                {firstLessonId && course.canRead ? (
                  <Link
                    href={`/${locale}/courses/${slug}/lessons/${firstLessonId}`}
                    className={buttonStyles('outline', 'md')}
                  >
                    {dict.courses.startLearning}
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    notFound()
  }

  const percent =
    lesson.lessonCount > 0
      ? Math.round((lesson.completedLessonCount / lesson.lessonCount) * 100)
      : 0

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/courses/${lesson.courseSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {dict.courses.backToCourse}
        </Link>
        <span className="text-xs text-muted-foreground">
          {format(dict.courses.progress, { percent: formatNumber(percent, locale) })}
        </span>
      </div>

      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {lesson.moduleTitle}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{lesson.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {format(dict.courses.estimatedMinutes, {
              count: formatNumber(lesson.estimatedMinutes, locale),
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            {format(dict.courses.lessonsCount, {
              count: formatNumber(lesson.lessonCount, locale),
            })}
          </span>
          {lesson.completed ? <Badge variant="success">{dict.courses.completed}</Badge> : null}
        </div>
      </header>

      <article className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="text-base leading-8 whitespace-pre-wrap text-foreground">
          {lesson.content}
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {lesson.prevLessonId ? (
          <Link
            href={`/${locale}/courses/${lesson.courseSlug}/lessons/${lesson.prevLessonId}`}
            className={buttonStyles('outline', 'md')}
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {dict.courses.previousLesson}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {lesson.nextLessonId ? (
          <Link
            href={`/${locale}/courses/${lesson.courseSlug}/lessons/${lesson.nextLessonId}`}
            className={buttonStyles('secondary', 'md')}
          >
            {dict.courses.nextLesson}
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {format(dict.courses.lessonsCount, {
              count: formatNumber(lesson.lessonCount, locale),
            })}
            {' · '}
            {formatNumber(lesson.completedLessonCount, locale)}
          </div>
          {lesson.isAuthor ? (
            <p className="text-xs text-muted-foreground">{dict.courses.editInStudio}</p>
          ) : (
            <CompleteLessonButton
              lessonId={lesson.id}
              completed={lesson.completed}
              labels={{
                complete: dict.courses.completeLesson,
                completing: dict.courses.completing,
                completed: dict.courses.completed,
                lessonCompleted: dict.courses.lessonCompleted,
                genericError: dict.errors.generic,
                errors: dict.errors,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
