import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Pencil, Plus, ScrollText } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary, format } from '@/i18n/dictionaries'
import { formatNumber } from '@/shared/utils/format'
import { getSessionUser } from '@/modules/identity/session'
import { canAuthorLearning } from '@/modules/identity/authorization'
import { listAuthorCourses } from '@/modules/learning/course.service'
import { listAuthorPublications } from '@/modules/learning/publication.service'
import { PageHeader } from '@/components/shared/page-header'
import { StudioAuthorOnly } from '@/components/learning/studio-guard'
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
  return { title: dict.meta.studioTitle }
}

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio`)}`)
  }
  if (!canAuthorLearning(viewer)) {
    return <StudioAuthorOnly locale={locale} />
  }

  const [courses, publications] = await Promise.all([
    listAuthorCourses(viewer),
    listAuthorPublications(viewer),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={dict.nav.studio}
        title={dict.studio.title}
        description={dict.studio.subtitle}
        actions={
          <>
            <Link href={`/${locale}/studio/courses/new`} className={buttonStyles('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {dict.studio.newCourse}
            </Link>
            <Link
              href={`/${locale}/studio/publications/new`}
              className={buttonStyles('secondary', 'md')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {dict.studio.newPublication}
            </Link>
          </>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{dict.studio.coursesTitle}</h2>
          <p className="text-sm text-muted-foreground">{dict.studio.coursesSubtitle}</p>
        </div>

        {courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8" aria-hidden="true" />}
            title={dict.studio.emptyCourses}
            description={dict.studio.emptyCoursesHint}
            action={
              <Link
                href={`/${locale}/studio/courses/new`}
                className={buttonStyles('primary', 'sm')}
              >
                {dict.studio.newCourse}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
                      {dict.studio[course.status]}
                    </Badge>
                    <Badge variant="neutral">{dict.courses.levels[course.level]}</Badge>
                  </div>
                  <CardTitle className="text-base">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatNumber(course.lessonCount, locale)} {dict.studio.statsLessons}
                    </div>
                  </dl>
                  <Link
                    href={`/${locale}/studio/courses/${course.id}`}
                    className={buttonStyles('outline', 'sm')}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {dict.studio.manage}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{dict.studio.publicationsTitle}</h2>
          <p className="text-sm text-muted-foreground">{dict.studio.publicationsSubtitle}</p>
        </div>

        {publications.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-8 w-8" aria-hidden="true" />}
            title={dict.studio.emptyPublications}
            description={dict.studio.emptyPublicationsHint}
            action={
              <Link
                href={`/${locale}/studio/publications/new`}
                className={buttonStyles('primary', 'sm')}
              >
                {dict.studio.newPublication}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((publication) => (
              <Card key={publication.id}>
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={publication.status === 'published' ? 'success' : 'warning'}>
                      {dict.studio[publication.status]}
                    </Badge>
                    <Badge variant="accent">
                      {format(dict.publications.chaptersCount, {
                        count: formatNumber(publication.chapterCount, locale),
                      })}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{publication.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {publication.summary}
                  </p>
                  <Link
                    href={`/${locale}/studio/publications/${publication.id}`}
                    className={buttonStyles('outline', 'sm')}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {dict.studio.manage}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
