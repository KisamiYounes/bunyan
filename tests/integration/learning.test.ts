import { describe, expect, it } from 'vitest'
import { toSessionUser } from '@/modules/identity/dto'
import { UserModel } from '@/modules/identity/user.model'
import { XpEventModel } from '@/modules/gamification/xp-event.model'
import { XP_POINTS } from '@/shared/constants'
import {
  completeLesson,
  createCourse,
  createLesson,
  createModule,
  enrollInCourse,
  getCourseBySlug,
  getLessonForViewer,
  listCourses,
  publishCourse,
} from '@/modules/learning/course.service'
import {
  createChapter,
  createPublication,
  getChapterForViewer,
  getPublicationBySlug,
  publishPublication,
  saveReadingProgress,
  updateChapter,
} from '@/modules/learning/publication.service'
import {
  getBookmarkState,
  getFollowState,
  getLibrary,
  toggleBookmark,
  toggleFollow,
} from '@/modules/library/library.service'
import { setupTestDatabase, createTestUser } from '../helpers/db'

setupTestDatabase()

const baseCourse = {
  title: 'Foundations of Clear Writing',
  slug: 'foundations-of-clear-writing',
  summary: 'A short course that turns fuzzy drafts into clear, purposeful prose.',
  description:
    'Learners practise one idea per paragraph, cut filler, and revise with a reader in mind.',
  topic: 'languages' as const,
  language: 'ar' as const,
  level: 'beginner' as const,
}

const basePublication = {
  title: 'Notes from the Classroom',
  slug: 'notes-from-the-classroom',
  summary: 'A serialized letter series about teaching, planning, and paying attention.',
  description:
    'Each chapter is a short letter that ends with a reflective question for the reader.',
  topic: 'professional' as const,
  language: 'ar' as const,
}

async function makeCourse(author: ReturnType<typeof toSessionUser>, lessonCount = 3) {
  const courseId = await createCourse(author, { ...baseCourse })
  const moduleId = await createModule(author, courseId, {
    title: 'Module One: Getting Started',
  })
  const lessonIds: string[] = []
  for (let index = 0; index < lessonCount; index += 1) {
    lessonIds.push(
      await createLesson(author, moduleId, {
        title: `Lesson ${index + 1}`,
        content: `Body of lesson ${index + 1}. Write the idea plainly, then remove one sentence.`,
        estimatedMinutes: 5,
      }),
    )
  }
  await publishCourse(author, courseId)
  return { courseId, moduleId, lessonIds }
}

describe('course drafts and enrollment boundaries', () => {
  it('keeps unpublished courses hidden from readers but visible to the author', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Course Author' }))
    const stranger = toSessionUser(await createTestUser({ name: 'Curious Reader' }))

    const courseId = await createCourse(author, { ...baseCourse })
    await createModule(author, courseId, { title: 'Draft Module' })

    await expect(getCourseBySlug(baseCourse.slug, stranger)).rejects.toMatchObject({
      code: 'COURSE_NOT_PUBLISHED',
    })

    const authorView = await getCourseBySlug(baseCourse.slug, author)
    expect(authorView.status).toBe('draft')
    expect(authorView.isAuthor).toBe(true)
    expect(authorView.canEdit).toBe(true)

    const listed = await listCourses({})
    expect(listed.items).toHaveLength(0)
  })

  it('gates lesson bodies behind enrollment while keeping curricula readable', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Lesson Author' }))
    const learner = toSessionUser(await createTestUser({ name: 'Enrolled Learner' }))
    const { courseId, lessonIds } = await makeCourse(author)

    const preview = await getCourseBySlug(baseCourse.slug, learner)
    expect(preview.canRead).toBe(false)
    expect(preview.enrollment).toBeNull()
    const previewLessons = preview.modules.flatMap((module) => module.lessons)
    expect(previewLessons).toHaveLength(3)
    expect(previewLessons[0]?.content).toBeUndefined()

    await expect(getLessonForViewer(baseCourse.slug, lessonIds[0]!, learner)).rejects.toMatchObject(
      { code: 'NOT_ENROLLED' },
    )

    await enrollInCourse(learner, courseId)

    const enrolled = await getCourseBySlug(baseCourse.slug, learner)
    expect(enrolled.canRead).toBe(true)
    expect(enrolled.enrollment?.status).toBe('active')

    const lesson = await getLessonForViewer(baseCourse.slug, lessonIds[0]!, learner)
    expect(lesson.content).toContain('Body of lesson 1')
    expect(lesson.nextLessonId).toBe(lessonIds[1])

    await expect(enrollInCourse(learner, courseId)).rejects.toMatchObject({
      code: 'ALREADY_ENROLLED',
    })
  })

  it('completes an enrollment after the final lesson and awards lesson XP once', async () => {
    const author = toSessionUser(
      await createTestUser({ role: 'educator', name: 'Completion Author' }),
    )
    const learner = toSessionUser(await createTestUser({ name: 'Finisher' }))
    const { courseId, lessonIds } = await makeCourse(author, 3)

    await enrollInCourse(learner, courseId)

    const first = await completeLesson(learner, lessonIds[0]!)
    expect(first).toMatchObject({ completedLessonCount: 1, status: 'active', xpAwarded: true })

    const replay = await completeLesson(learner, lessonIds[0]!)
    expect(replay).toMatchObject({ completedLessonCount: 1, status: 'active', xpAwarded: false })

    const xpEvents = await XpEventModel.countDocuments({
      userId: learner.id,
      kind: 'lesson_completed',
      refId: lessonIds[0],
    })
    expect(xpEvents).toBe(1)

    const afterFirst = await UserModel.findById(learner.id).lean()
    expect(afterFirst?.xp).toBe(XP_POINTS.lesson_completed)

    await completeLesson(learner, lessonIds[1]!)
    const final = await completeLesson(learner, lessonIds[2]!)
    expect(final).toMatchObject({
      completedLessonCount: 3,
      status: 'completed',
      xpAwarded: true,
    })

    const detail = await getCourseBySlug(baseCourse.slug, learner)
    expect(detail.enrollment?.status).toBe('completed')
    expect(detail.enrollment?.progress).toBe(1)
    expect(detail.enrollment?.lastLessonId).toBe(lessonIds[2])

    const totalXp = await UserModel.findById(learner.id).lean()
    expect(totalXp?.xp).toBe(XP_POINTS.lesson_completed * 3)
  })

  it('refuses to publish a course without a module and lesson', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Empty Author' }))
    const courseId = await createCourse(author, { ...baseCourse, slug: 'empty-course' })

    await expect(publishCourse(author, courseId)).rejects.toMatchObject({
      code: 'CANNOT_PUBLISH_EMPTY',
    })
  })
})

describe('serialized publications and reading position', () => {
  it('hides draft chapters from readers and blocks publishing without a published chapter', async () => {
    const author = toSessionUser(
      await createTestUser({ role: 'educator', name: 'Publication Author' }),
    )
    const reader = toSessionUser(await createTestUser({ name: 'Reader' }))

    const publicationId = await createPublication(author, { ...basePublication })
    const draftChapterId = await createChapter(author, publicationId, {
      title: 'Chapter One: Draft',
      content: 'This chapter is still being written and must not leak to readers.',
    })

    await expect(publishPublication(author, publicationId)).rejects.toMatchObject({
      code: 'CANNOT_PUBLISH_EMPTY',
    })

    const publishedChapterId = await createChapter(author, publicationId, {
      title: 'Chapter Two: Ready',
      content: 'This chapter is ready for readers and should appear in the table of contents.',
    })
    await updateChapter(author, publishedChapterId, { status: 'published' })
    await publishPublication(author, publicationId)

    const readerView = await getPublicationBySlug(basePublication.slug, reader)
    expect(readerView.status).toBe('published')
    expect(readerView.chapters).toHaveLength(1)
    expect(readerView.chapters[0]).toMatchObject({
      id: publishedChapterId,
      status: 'published',
    })
    expect(readerView.chapters[0]?.content).toBeUndefined()

    await expect(
      getChapterForViewer(basePublication.slug, draftChapterId, reader),
    ).rejects.toMatchObject({ code: 'CHAPTER_NOT_FOUND' })

    const authorView = await getPublicationBySlug(basePublication.slug, author)
    expect(authorView.chapters).toHaveLength(2)
    expect(authorView.chapters.find((chapter) => chapter.id === draftChapterId)?.content).toContain(
      'still being written',
    )
  })

  it('saves and restores the reader position at the exact chapter and scroll fraction', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Serial Author' }))
    const reader = toSessionUser(await createTestUser({ name: 'Serial Reader' }))

    const publicationId = await createPublication(author, { ...basePublication })
    const firstChapterId = await createChapter(author, publicationId, {
      title: 'Chapter One',
      content: 'The opening letter.',
    })
    await updateChapter(author, firstChapterId, { status: 'published' })
    const secondChapterId = await createChapter(author, publicationId, {
      title: 'Chapter Two',
      content: 'The follow-up letter.',
    })
    await updateChapter(author, secondChapterId, { status: 'published' })
    await publishPublication(author, publicationId)

    await saveReadingProgress(reader, publicationId, {
      chapterId: firstChapterId,
      scroll: 0.42,
    })

    const resumed = await getChapterForViewer(basePublication.slug, firstChapterId, reader)
    expect(resumed.scroll).toBeCloseTo(0.42)

    const detail = await getPublicationBySlug(basePublication.slug, reader)
    expect(detail.progress).toEqual({ chapterId: firstChapterId, scroll: 0.42 })

    await saveReadingProgress(reader, publicationId, {
      chapterId: secondChapterId,
      scroll: 0.75,
    })

    const moved = await getChapterForViewer(basePublication.slug, secondChapterId, reader)
    expect(moved.scroll).toBeCloseTo(0.75)
    const previous = await getChapterForViewer(basePublication.slug, firstChapterId, reader)
    expect(previous.scroll).toBe(0)

    const library = await getLibrary(reader)
    expect(library.reading).toHaveLength(1)
    expect(library.reading[0]).toMatchObject({
      publicationId,
      chapterId: secondChapterId,
      chapterTitle: 'Chapter Two',
    })
    expect(library.reading[0]?.scroll).toBeCloseTo(0.75)
  })

  it('rejects saving progress for a draft chapter', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Draft Author' }))
    const reader = toSessionUser(await createTestUser({ name: 'Draft Reader' }))

    const publicationId = await createPublication(author, { ...basePublication })
    const publishedChapterId = await createChapter(author, publicationId, {
      title: 'Published Chapter',
      content: 'Visible to readers.',
    })
    await updateChapter(author, publishedChapterId, { status: 'published' })
    const draftChapterId = await createChapter(author, publicationId, {
      title: 'Draft Chapter',
      content: 'Not visible to readers.',
    })
    await publishPublication(author, publicationId)

    await expect(
      saveReadingProgress(reader, publicationId, {
        chapterId: draftChapterId,
        scroll: 0.3,
      }),
    ).rejects.toMatchObject({ code: 'CHAPTER_NOT_FOUND' })
  })
})

describe('bookmarks and follows', () => {
  it('toggles course bookmarks and follows idempotently', async () => {
    const author = toSessionUser(await createTestUser({ role: 'educator', name: 'Library Author' }))
    const learner = toSessionUser(await createTestUser({ name: 'Library Learner' }))
    const { courseId } = await makeCourse(author, 1)

    const bookmarked = await toggleBookmark(learner, {
      targetType: 'course',
      targetId: courseId,
    })
    expect(bookmarked.bookmarked).toBe(true)
    expect(await getBookmarkState(learner.id, 'course', courseId)).toBe(true)

    const followed = await toggleFollow(learner, {
      targetType: 'course',
      targetId: courseId,
    })
    expect(followed.following).toBe(true)
    expect(await getFollowState(learner.id, 'course', courseId)).toBe(true)

    const library = await getLibrary(learner)
    expect(library.bookmarks).toHaveLength(1)
    expect(library.bookmarks[0]?.title).toBe(baseCourse.title)
    expect(library.following).toHaveLength(1)
    expect(library.following[0]?.title).toBe(baseCourse.title)

    const unbookmarked = await toggleBookmark(learner, {
      targetType: 'course',
      targetId: courseId,
    })
    expect(unbookmarked.bookmarked).toBe(false)
    expect(await getBookmarkState(learner.id, 'course', courseId)).toBe(false)

    const unfollowed = await toggleFollow(learner, {
      targetType: 'course',
      targetId: courseId,
    })
    expect(unfollowed.following).toBe(false)
    expect(await getFollowState(learner.id, 'course', courseId)).toBe(false)
  })

  it('follows another user and refuses self-follows', async () => {
    const learner = toSessionUser(await createTestUser({ name: 'Follower' }))
    const target = toSessionUser(await createTestUser({ name: 'Followed Educator' }))

    const result = await toggleFollow(learner, {
      targetType: 'user',
      targetId: target.id,
    })
    expect(result.following).toBe(true)
    expect(await getFollowState(learner.id, 'user', target.id)).toBe(true)

    const library = await getLibrary(learner)
    expect(library.following[0]).toMatchObject({
      targetType: 'user',
      targetId: target.id,
      title: target.name,
      username: target.username,
    })

    await expect(
      toggleFollow(learner, { targetType: 'user', targetId: learner.id }),
    ).rejects.toMatchObject({ code: 'CANNOT_FOLLOW_SELF' })
  })

  it('refuses to bookmark a course that is still a draft', async () => {
    const author = toSessionUser(
      await createTestUser({ role: 'educator', name: 'Draft Course Author' }),
    )
    const learner = toSessionUser(await createTestUser({ name: 'Eager Learner' }))
    const courseId = await createCourse(author, { ...baseCourse })

    await expect(
      toggleBookmark(learner, { targetType: 'course', targetId: courseId }),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
  })
})
