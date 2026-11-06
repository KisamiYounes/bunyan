import type { Types } from 'mongoose'
import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import type { SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { UserModel } from '@/modules/identity/user.model'
import { escapeRegExp } from '@/shared/utils/pagination'
import type { BookmarkTargetType, FollowTargetType } from '@/shared/constants'
import { CourseModel, type CourseRecord } from '@/modules/learning/course.model'
import { PublicationModel, type PublicationRecord } from '@/modules/learning/publication.model'
import { ChapterModel } from '@/modules/learning/chapter.model'
import { EnrollmentModel, type EnrollmentRecord } from '@/modules/learning/enrollment.model'
import {
  ReadingProgressModel,
  type ReadingProgressRecord,
} from '@/modules/learning/reading-progress.model'
import { CommunityModel } from '@/modules/communities/community.model'
import { BookmarkModel, type BookmarkRecord } from './bookmark.model'
import { FollowModel, type FollowRecord } from './follow.model'
import type { BookmarkInput, FollowInput } from './validation'

export interface BookmarkLink {
  targetType: BookmarkTargetType
  targetId: string
  title: string
  slug: string
}

export interface FollowLink {
  targetType: FollowTargetType
  targetId: string
  title: string
  slug?: string
  username?: string
}

export interface LibraryCourse {
  id: string
  title: string
  slug: string
  lessonCount: number
  completedLessonCount: number
  status: 'active' | 'completed'
  progress: number
  lastLessonId?: string
  lastAccessedAt: string
}

export interface LibraryReading {
  publicationId: string
  title: string
  slug: string
  chapterId: string
  chapterTitle: string
  scroll: number
  updatedAt: string
}

export interface LibraryData {
  courses: LibraryCourse[]
  reading: LibraryReading[]
  bookmarks: BookmarkLink[]
  following: FollowLink[]
}

export async function toggleBookmark(
  user: SessionUser,
  input: BookmarkInput,
): Promise<{ bookmarked: boolean }> {
  await connectToDatabase()
  await assertTargetExists(input.targetType, input.targetId, user)

  const existing = await BookmarkModel.findOne({
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()

  if (existing) {
    await BookmarkModel.deleteOne({ _id: existing._id })
    return { bookmarked: false }
  }

  await BookmarkModel.create({
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
  })
  return { bookmarked: true }
}

export async function toggleFollow(
  user: SessionUser,
  input: FollowInput,
): Promise<{ following: boolean }> {
  if (input.targetType === 'user' && input.targetId === user.id) {
    throw new AppError('CANNOT_FOLLOW_SELF')
  }
  await connectToDatabase()
  await assertTargetExists(input.targetType, input.targetId, user)

  const existing = await FollowModel.findOne({
    followerId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()

  if (existing) {
    await FollowModel.deleteOne({ _id: existing._id })
    return { following: false }
  }

  await FollowModel.create({
    followerId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
  })
  return { following: true }
}

export async function getBookmarkState(
  userId: string,
  targetType: BookmarkTargetType,
  targetId: string,
): Promise<boolean> {
  await connectToDatabase()
  const bookmark = await BookmarkModel.findOne({ userId, targetType, targetId })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()
  return Boolean(bookmark)
}

export async function getFollowState(
  userId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<boolean> {
  await connectToDatabase()
  const follow = await FollowModel.findOne({
    followerId: userId,
    targetType,
    targetId,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()
  return Boolean(follow)
}

export async function getLibrary(user: SessionUser): Promise<LibraryData> {
  await connectToDatabase()
  const [enrollments, reading, bookmarks, follows] = await Promise.all([
    EnrollmentModel.find({ userId: user.id })
      .sort({ lastAccessedAt: -1 })
      .limit(100)
      .lean<EnrollmentRecord[]>(),
    ReadingProgressModel.find({ userId: user.id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean<ReadingProgressRecord[]>(),
    BookmarkModel.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean<BookmarkRecord[]>(),
    FollowModel.find({ followerId: user.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean<FollowRecord[]>(),
  ])

  const courseIds = enrollments.map((item) => item.courseId)
  const readingPublicationIds = reading.map((item) => item.publicationId)
  const readingChapterIds = reading.map((item) => item.lastChapterId)

  const [courseDocs, readingPublications, readingChapters] = await Promise.all([
    CourseModel.find({ _id: { $in: courseIds } }).lean<CourseRecord[]>(),
    PublicationModel.find({ _id: { $in: readingPublicationIds } }).lean<PublicationRecord[]>(),
    ChapterModel.find({ _id: { $in: readingChapterIds } })
      .select('title')
      .lean<Array<{ _id: unknown; title: string }>>(),
  ])

  const courseById = new Map(courseDocs.map((course) => [String(course._id), course]))
  const publicationById = new Map(
    readingPublications.map((publication) => [String(publication._id), publication]),
  )
  const chapterById = new Map(readingChapters.map((chapter) => [String(chapter._id), chapter]))

  const libraryCourses: LibraryCourse[] = []
  for (const enrollment of enrollments) {
    const course = courseById.get(enrollment.courseId.toString())
    if (!course) continue
    libraryCourses.push({
      id: String(course._id),
      title: course.title,
      slug: course.slug,
      lessonCount: course.lessonCount,
      completedLessonCount: enrollment.completedLessonCount,
      status: enrollment.status,
      progress:
        course.lessonCount > 0
          ? Math.min(1, enrollment.completedLessonCount / course.lessonCount)
          : 0,
      lastLessonId: enrollment.lastLessonId?.toString(),
      lastAccessedAt: enrollment.lastAccessedAt.toISOString(),
    })
  }

  const libraryReading: LibraryReading[] = []
  for (const item of reading) {
    const publication = publicationById.get(item.publicationId.toString())
    if (!publication) continue
    libraryReading.push({
      publicationId: String(publication._id),
      title: publication.title,
      slug: publication.slug,
      chapterId: item.lastChapterId.toString(),
      chapterTitle: chapterById.get(item.lastChapterId.toString())?.title ?? '',
      scroll: item.scroll,
      updatedAt: item.updatedAt.toISOString(),
    })
  }

  return {
    courses: libraryCourses,
    reading: libraryReading,
    bookmarks: await resolveBookmarks(bookmarks),
    following: await resolveFollows(follows),
  }
}

export interface SearchResults {
  courses: Array<{ id: string; title: string; slug: string; summary: string }>
  publications: Array<{ id: string; title: string; slug: string; summary: string }>
  communities: Array<{ id: string; name: string; slug: string; description: string }>
}

export async function searchPlatform(query: string): Promise<SearchResults> {
  const trimmed = query.trim()
  if (!trimmed) return { courses: [], publications: [], communities: [] }

  await connectToDatabase()
  const pattern = new RegExp(escapeRegExp(trimmed), 'i')
  const [courses, publications, communities] = await Promise.all([
    CourseModel.find({ status: 'published', $or: [{ title: pattern }, { summary: pattern }] })
      .sort({ enrollmentCount: -1 })
      .limit(6)
      .select('title slug summary')
      .lean<Array<{ _id: unknown; title: string; slug: string; summary: string }>>(),
    PublicationModel.find({ status: 'published', $or: [{ title: pattern }, { summary: pattern }] })
      .sort({ publishedAt: -1 })
      .limit(6)
      .select('title slug summary')
      .lean<Array<{ _id: unknown; title: string; slug: string; summary: string }>>(),
    CommunityModel.find({
      status: 'active',
      visibility: 'public',
      $or: [{ name: pattern }, { description: pattern }],
    })
      .sort({ memberCount: -1 })
      .limit(6)
      .select('name slug description')
      .lean<Array<{ _id: unknown; name: string; slug: string; description: string }>>(),
  ])

  return {
    courses: courses.map((item) => ({
      id: String(item._id),
      title: item.title,
      slug: item.slug,
      summary: item.summary,
    })),
    publications: publications.map((item) => ({
      id: String(item._id),
      title: item.title,
      slug: item.slug,
      summary: item.summary,
    })),
    communities: communities.map((item) => ({
      id: String(item._id),
      name: item.name,
      slug: item.slug,
      description: item.description,
    })),
  }
}

async function assertTargetExists(
  targetType: BookmarkTargetType | FollowTargetType,
  targetId: string,
  user: SessionUser,
): Promise<void> {
  if (targetType === 'course') {
    const course = await CourseModel.findById(targetId)
      .select('authorId status')
      .lean<{ authorId: Types.ObjectId; status: string } | null>()
    if (!course) throw new AppError('COURSE_NOT_FOUND')
    if (
      course.status !== 'published' &&
      course.authorId.toString() !== user.id &&
      user.role !== 'admin'
    ) {
      throw new AppError('COURSE_NOT_FOUND')
    }
    return
  }
  if (targetType === 'publication') {
    const publication = await PublicationModel.findById(targetId)
      .select('authorId status')
      .lean<{ authorId: Types.ObjectId; status: string } | null>()
    if (!publication) throw new AppError('PUBLICATION_NOT_FOUND')
    if (
      publication.status !== 'published' &&
      publication.authorId.toString() !== user.id &&
      user.role !== 'admin'
    ) {
      throw new AppError('PUBLICATION_NOT_FOUND')
    }
    return
  }

  const targetUser = await UserModel.findById(targetId)
    .select('status')
    .lean<{ status: string } | null>()
  if (!targetUser || targetUser.status !== 'active') throw new AppError('USER_NOT_FOUND')
}

async function resolveBookmarks(
  bookmarks: Array<{ targetType: BookmarkTargetType; targetId: Types.ObjectId }>,
): Promise<BookmarkLink[]> {
  const courseIds = bookmarks
    .filter((item) => item.targetType === 'course')
    .map((item) => item.targetId)
  const publicationIds = bookmarks
    .filter((item) => item.targetType === 'publication')
    .map((item) => item.targetId)
  const [courses, publications] = await Promise.all([
    CourseModel.find({ _id: { $in: courseIds } })
      .select('title slug')
      .lean<Array<{ _id: unknown; title: string; slug: string }>>(),
    PublicationModel.find({ _id: { $in: publicationIds } })
      .select('title slug')
      .lean<Array<{ _id: unknown; title: string; slug: string }>>(),
  ])
  const courseById = new Map(courses.map((item) => [String(item._id), item]))
  const publicationById = new Map(publications.map((item) => [String(item._id), item]))

  return bookmarks.flatMap((bookmark): BookmarkLink[] => {
    const id = bookmark.targetId.toString()
    if (bookmark.targetType === 'course') {
      const course = courseById.get(id)
      return course
        ? [
            {
              targetType: bookmark.targetType,
              targetId: id,
              title: course.title,
              slug: course.slug,
            },
          ]
        : []
    }
    const publication = publicationById.get(id)
    return publication
      ? [
          {
            targetType: bookmark.targetType,
            targetId: id,
            title: publication.title,
            slug: publication.slug,
          },
        ]
      : []
  })
}

async function resolveFollows(
  follows: Array<{ targetType: FollowTargetType; targetId: Types.ObjectId }>,
): Promise<FollowLink[]> {
  const courseIds = follows
    .filter((item) => item.targetType === 'course')
    .map((item) => item.targetId)
  const publicationIds = follows
    .filter((item) => item.targetType === 'publication')
    .map((item) => item.targetId)
  const userIds = follows.filter((item) => item.targetType === 'user').map((item) => item.targetId)

  const [courses, publications, users] = await Promise.all([
    CourseModel.find({ _id: { $in: courseIds } })
      .select('title slug')
      .lean<Array<{ _id: unknown; title: string; slug: string }>>(),
    PublicationModel.find({ _id: { $in: publicationIds } })
      .select('title slug')
      .lean<Array<{ _id: unknown; title: string; slug: string }>>(),
    getUsersByIds(userIds.map(String)),
  ])
  const courseById = new Map(courses.map((item) => [String(item._id), item]))
  const publicationById = new Map(publications.map((item) => [String(item._id), item]))

  return follows.flatMap((follow): FollowLink[] => {
    const id = follow.targetId.toString()
    if (follow.targetType === 'course') {
      const course = courseById.get(id)
      return course
        ? [{ targetType: follow.targetType, targetId: id, title: course.title, slug: course.slug }]
        : []
    }
    if (follow.targetType === 'publication') {
      const publication = publicationById.get(id)
      return publication
        ? [
            {
              targetType: follow.targetType,
              targetId: id,
              title: publication.title,
              slug: publication.slug,
            },
          ]
        : []
    }
    const target = users.get(id)
    return target
      ? [
          {
            targetType: follow.targetType,
            targetId: id,
            title: target.name,
            username: target.username,
          },
        ]
      : []
  })
}
