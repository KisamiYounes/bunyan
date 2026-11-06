import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { getSessionUser } from '@/modules/identity/session'
import { canAuthorLearning } from '@/modules/identity/authorization'
import { getCourseForEdit } from '@/modules/learning/course.service'
import { PageHeader } from '@/components/shared/page-header'
import { StudioAuthorOnly } from '@/components/learning/studio-guard'
import { CourseForm } from '@/components/learning/course-form'
import { CurriculumEditor } from '@/components/learning/curriculum-editor'
import { ManageActions } from '@/components/learning/manage-actions'
import { Badge } from '@/components/ui/badge'
import { buttonStyles } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(isLocale(locale) ? locale : 'ar')
  return { title: dict.studio.courseEditor }
}

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const viewer = await getSessionUser()
  if (!viewer) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/studio/courses/${id}`)}`)
  }
  if (!canAuthorLearning(viewer)) {
    return <StudioAuthorOnly locale={locale} title={dict.studio.courseEditor} />
  }

  const course = await getCourseForEdit(viewer, id).catch(() => null)
  if (!course) notFound()

  const canPublish = course.modules.length > 0 && course.lessonCount > 0

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/${locale}/studio`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {dict.studio.backToStudio}
      </Link>

      <PageHeader
        eyebrow={dict.studio.courseEditor}
        title={course.title}
        description={dict.studio.coursesSubtitle}
        actions={
          <>
            <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
              {dict.studio[course.status]}
            </Badge>
            {course.status === 'published' ? (
              <Link
                href={`/${locale}/courses/${course.slug}`}
                className={buttonStyles('outline', 'sm')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {dict.studio.open}
              </Link>
            ) : null}
          </>
        }
      />

      <ManageActions
        kind="course"
        id={course.id}
        status={course.status}
        canPublish={canPublish}
        labels={{
          publish: dict.studio.publishCourse,
          publishing: dict.studio.publishing,
          archive: dict.studio.archive,
          archiving: dict.studio.archiving,
          confirmArchive: dict.studio.confirmArchive,
          publishBlocked: dict.studio.publishBlockedCourse,
          publishedSuccess: dict.studio.publishedSuccess,
          archivedSuccess: dict.studio.archivedSuccess,
          genericError: dict.errors.generic,
          errors: dict.errors,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{dict.studio.courseSettings}</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            locale={locale}
            mode="edit"
            courseId={course.id}
            initial={{
              title: course.title,
              slug: course.slug,
              summary: course.summary,
              description: course.description,
              topic: course.topic,
              language: course.language as 'ar' | 'en' | 'fr',
              level: course.level,
            }}
            labels={{
              title: dict.studio.courseTitle,
              summary: dict.studio.courseSummary,
              summaryHint: dict.studio.summaryHint,
              description: dict.studio.description,
              descriptionHint: dict.studio.descriptionHint,
              slug: dict.studio.slug,
              slugHint: dict.studio.slugHint,
              topic: dict.studio.topic,
              language: dict.studio.language,
              level: dict.studio.level,
              submit: dict.studio.saveChanges,
              submitting: dict.common.saving,
              saved: dict.studio.saved,
              genericError: dict.errors.generic,
              errors: dict.errors,
              topicOptions: dict.communities.topicOptions,
              levelOptions: dict.courses.levels,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.studio.curriculum}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurriculumEditor
            courseId={course.id}
            modules={course.modules}
            labels={{
              modules: dict.studio.modules,
              addModule: dict.studio.addModule,
              moduleTitle: dict.studio.moduleTitle,
              addModuleAction: dict.studio.addModuleAction,
              moduleEmpty: dict.studio.moduleEmpty,
              moduleEmptyHint: dict.studio.moduleEmptyHint,
              addLesson: dict.studio.addLesson,
              lessonTitle: dict.studio.lessonTitle,
              lessonContent: dict.studio.lessonContent,
              lessonContentHint: dict.studio.lessonContentHint,
              estimatedMinutes: dict.studio.estimatedMinutes,
              addLessonAction: dict.studio.addLessonAction,
              saveChanges: dict.studio.saveChanges,
              deleteModule: dict.studio.deleteModule,
              confirmDeleteModule: dict.studio.confirmDeleteModule,
              deleteLesson: dict.studio.deleteLesson,
              confirmDeleteLesson: dict.studio.confirmDeleteLesson,
              genericError: dict.errors.generic,
              errors: dict.errors,
              durationTemplate: dict.courses.estimatedMinutes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
