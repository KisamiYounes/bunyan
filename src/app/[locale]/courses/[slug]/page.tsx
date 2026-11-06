import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Lock, Pencil, Users } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatDate, formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { getCourseBySlug } from '@/modules/learning/course.service'
import { getBookmarkState, getFollowState } from '@/modules/library/library.service'
import { BookmarkButton, EnrollButton, FollowButton } from '@/components/learning/actions'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.meta.coursesTitle }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  const course = await getCourseBySlug(slug, viewer).catch(() => null)
  if (!course) notFound()

  const [bookmarked, following] = viewer
    ? await Promise.all([
        getBookmarkState(viewer.id, 'course', course.id),
        getFollowState(viewer.id, 'course', course.id),
      ])
    : [false, false]

  const enrolled = Boolean(course.enrollment)
  const lessons = course.modules.flatMap((module) => module.lessons)
  const firstLessonId = lessons[0]?.id
  const continueLessonId = course.enrollment?.lastLessonId ?? firstLessonId
  const canOpenLessons = course.canRead
  const progressPercent = Math.round((course.enrollment?.progress ?? 0) * 100)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/courses`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.common.back}
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="primary">{dict.courses.levels[course.level]}</Badge>
          {course.topic ? (
            <Badge variant="neutral">{dict.communities.topicOptions[course.topic]}</Badge>
          ) : null}
          {course.status !== 'published' ? (
            <Badge variant="warning">{dict.studio.draft}</Badge>
          ) : null}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{course.summary}</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {course.author ? (
            <span className="inline-flex items-center gap-2">
              <Avatar name={course.author.name} src={course.author.avatarUrl} size="sm" />
              {format(dict.courses.byAuthor, { name: course.author.name })}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {format(dict.courses.lessonsCount, {
              count: formatNumber(course.lessonCount, locale),
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden="true" />
            {format(dict.courses.enrollmentsCount, {
              count: formatNumber(course.enrollmentCount, locale),
            })}
          </span>
          {course.publishedAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatDate(course.publishedAt, locale)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {course.canEdit ? (
            <Link
              href={`/${locale}/studio/courses/${course.id}`}
              className={buttonStyles('secondary', 'md')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {dict.courses.editInStudio}
            </Link>
          ) : (
            <EnrollButton
              locale={locale}
              courseId={course.id}
              courseSlug={course.slug}
              authenticated={Boolean(viewer)}
              enrolled={enrolled}
              continueLessonId={continueLessonId}
              labels={{
                enroll: dict.courses.enroll,
                enrolling: dict.courses.enrolling,
                enrolled: dict.courses.enrolled,
                continueLearning: dict.courses.continueLearning,
                startLearning: dict.courses.startLearning,
                signInToEnroll: dict.courses.signInToEnroll,
                enrollmentSuccess: dict.courses.enrollmentSuccess,
                genericError: dict.errors.generic,
                errors: dict.errors,
              }}
            />
          )}

          <BookmarkButton
            targetType="course"
            targetId={course.id}
            initialBookmarked={bookmarked}
            authenticated={Boolean(viewer)}
            locale={locale}
            labels={{
              bookmark: dict.common.bookmark,
              bookmarked: dict.common.bookmarked,
              signIn: dict.common.signInToSave,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />

          <FollowButton
            targetType="course"
            targetId={course.id}
            initialFollowing={following}
            authenticated={Boolean(viewer)}
            locale={locale}
            labels={{
              follow: dict.common.follow,
              following: dict.common.following,
              signIn: dict.common.signInToSave,
              genericError: dict.errors.generic,
              errors: dict.errors,
            }}
          />
        </div>

        {course.enrollment ? (
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{dict.courses.yourProgress}</span>
              <span className="text-muted-foreground">
                {format(dict.courses.progress, {
                  percent: formatNumber(progressPercent, locale),
                })}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {course.enrollment.status === 'completed' ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {dict.courses.courseComplete}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{dict.studio.description}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                {course.description}
              </p>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">{dict.courses.curriculum}</h2>
            {course.modules.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
                title={dict.courses.noLessons}
                description={dict.courses.noLessonsHint}
              />
            ) : (
              <ol className="space-y-4">
                {course.modules.map((module, moduleIndex) => (
                  <li key={module.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {format(dict.courses.module, {})} {formatNumber(moduleIndex + 1, locale)}
                          {' — '}
                          {module.title}
                        </CardTitle>
                        {module.summary ? (
                          <p className="text-sm text-muted-foreground">{module.summary}</p>
                        ) : null}
                      </CardHeader>
                      <CardContent>
                        {module.lessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{dict.courses.noLessons}</p>
                        ) : (
                          <ul className="divide-y divide-border">
                            {module.lessons.map((lesson) => (
                              <li key={lesson.id} className="flex items-center gap-3 py-3">
                                {lesson.completed ? (
                                  <CheckCircle2
                                    className="h-4 w-4 shrink-0 text-success"
                                    aria-hidden="true"
                                  />
                                ) : canOpenLessons ? (
                                  <BookOpen
                                    className="h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Lock
                                    className="h-4 w-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  {canOpenLessons ? (
                                    <Link
                                      href={`/${locale}/courses/${course.slug}/lessons/${lesson.id}`}
                                      className="block truncate text-sm font-medium hover:text-primary"
                                    >
                                      {lesson.title}
                                    </Link>
                                  ) : (
                                    <span className="block truncate text-sm font-medium">
                                      {lesson.title}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    {format(dict.courses.estimatedMinutes, {
                                      count: formatNumber(lesson.estimatedMinutes, locale),
                                    })}
                                  </span>
                                </div>
                                {lesson.completed ? (
                                  <Badge variant="success">{dict.courses.completed}</Badge>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {!course.canRead ? (
            <Card>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Lock className="h-4 w-4 text-warning" aria-hidden="true" />
                  {dict.courses.requiresEnrollment}
                </div>
                <p className="text-muted-foreground">
                  {viewer ? dict.courses.requiresEnrollment : dict.courses.signInToEnroll}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{dict.courses.lessons}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.studio.level}</dt>
                  <dd>{dict.courses.levels[course.level]}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.studio.lessons}</dt>
                  <dd>{formatNumber(course.lessonCount, locale)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.studio.statsEnrollments}</dt>
                  <dd>{formatNumber(course.enrollmentCount, locale)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
