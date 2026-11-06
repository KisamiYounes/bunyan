import type { Types } from 'mongoose'
import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import { assertCanParticipate } from '@/modules/identity/authorization'
import type { PublicUser, SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { awardXp } from '@/modules/gamification/xp.service'
import { escapeRegExp } from '@/shared/utils/pagination'
import type { CourseLevel, CourseStatus, Topic } from '@/shared/constants'
import { CourseModel, type CourseRecord } from './course.model'
import { CourseModuleModel, type CourseModuleRecord } from './course-module.model'
import { LessonModel, type LessonRecord } from './lesson.model'
import { EnrollmentModel, type EnrollmentRecord } from './enrollment.model'
import { LessonProgressModel } from './lesson-progress.model'
import type {
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateModuleInput,
} from './validation'

export interface CourseCard {
  id: string
  title: string
  slug: string
  summary: string
  topic?: Topic
  language: string
  level: CourseLevel
  status: CourseStatus
  lessonCount: number
  enrollmentCount: number
  author: PublicUser | null
  publishedAt?: string
}

export interface LessonSummary {
  id: string
  moduleId: string
  title: string
  position: number
  estimatedMinutes: number
  completed: boolean
  /** Present only for the author or an admin, so curriculum payloads never leak bodies. */
  content?: string
}

export interface ModuleView {
  id: string
  title: string
  summary?: string
  position: number
  lessons: LessonSummary[]
}

export interface CourseDetail extends CourseCard {
  description: string
  modules: ModuleView[]
  isAuthor: boolean
  canEdit: boolean
  canRead: boolean
  enrollment: {
    status: 'active' | 'completed'
    completedLessonCount: number
    lastLessonId?: string
    progress: number
  } | null
}

export interface LessonView {
  id: string
  courseId: string
  courseSlug: string
  courseTitle: string
  moduleTitle: string
  title: string
  content: string
  position: number
  estimatedMinutes: number
  completed: boolean
  completedLessonCount: number
  lessonCount: number
  prevLessonId?: string
  nextLessonId?: string
  isAuthor: boolean
}

export async function listCourses(params: {
  page?: number
  limit?: number
  search?: string
  topic?: Topic
  authorId?: string
}): Promise<{ items: CourseCard[]; total: number; page: number; limit: number }> {
  await connectToDatabase()
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? 12))
  const filter: Record<string, unknown> = { status: 'published' }
  if (params.topic) filter.topic = params.topic
  if (params.authorId) filter.authorId = params.authorId
  if (params.search?.trim()) {
    const pattern = new RegExp(escapeRegExp(params.search.trim()), 'i')
    filter.$or = [{ title: pattern }, { summary: pattern }]
  }

  const [courses, total] = await Promise.all([
    CourseModel.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<CourseRecord[]>(),
    CourseModel.countDocuments(filter),
  ])

  const authors = await getUsersByIds(courses.map((course) => course.authorId.toString()))
  return {
    items: courses.map((course) => toCourseCard(course, authors.get(course.authorId.toString()))),
    total,
    page,
    limit,
  }
}

export async function listAuthorCourses(user: SessionUser): Promise<CourseCard[]> {
  await connectToDatabase()
  const courses = await CourseModel.find({ authorId: user.id })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean<CourseRecord[]>()
  const authors = await getUsersByIds([user.id])
  const author = authors.get(user.id) ?? null
  return courses.map((course) => toCourseCard(course, author))
}

export async function getCourseBySlug(
  slug: string,
  viewer: SessionUser | null,
): Promise<CourseDetail> {
  await connectToDatabase()
  const course = await CourseModel.findOne({ slug }).lean<CourseRecord | null>()
  if (!course) throw new AppError('COURSE_NOT_FOUND')

  const isAuthor = Boolean(viewer && course.authorId.toString() === viewer.id)
  const isAdmin = viewer?.role === 'admin'
  const canEdit = isAuthor || Boolean(isAdmin)
  if (course.status !== 'published' && !canEdit) {
    throw new AppError('COURSE_NOT_PUBLISHED')
  }

  const [modules, lessons, enrollment, authors] = await Promise.all([
    CourseModuleModel.find({ courseId: course._id })
      .sort({ position: 1 })
      .lean<CourseModuleRecord[]>(),
    LessonModel.find({ courseId: course._id }).sort({ position: 1 }).lean<LessonRecord[]>(),
    viewer
      ? EnrollmentModel.findOne({
          userId: viewer.id,
          courseId: course._id,
        }).lean<EnrollmentRecord | null>()
      : Promise.resolve(null),
    getUsersByIds([course.authorId.toString()]),
  ])

  let completedIds = new Set<string>()
  if (viewer && enrollment) {
    const progress = await LessonProgressModel.find({ userId: viewer.id, courseId: course._id })
      .select('lessonId')
      .lean<Array<{ lessonId: { toString(): string } }>>()
    completedIds = new Set(progress.map((item) => item.lessonId.toString()))
  }

  const lessonsByModule = new Map<string, LessonSummary[]>()
  for (const lesson of lessons) {
    const moduleId = lesson.moduleId.toString()
    const list = lessonsByModule.get(moduleId) ?? []
    list.push({
      id: String(lesson._id),
      moduleId,
      title: lesson.title,
      position: lesson.position,
      estimatedMinutes: lesson.estimatedMinutes,
      completed: completedIds.has(String(lesson._id)),
      ...(canEdit ? { content: lesson.content } : {}),
    })
    lessonsByModule.set(moduleId, list)
  }

  const progress =
    enrollment && course.lessonCount > 0
      ? Math.min(1, enrollment.completedLessonCount / course.lessonCount)
      : 0

  return {
    ...toCourseCard(course, authors.get(course.authorId.toString())),
    description: course.description,
    modules: modules.map((moduleItem) => ({
      id: String(moduleItem._id),
      title: moduleItem.title,
      summary: moduleItem.summary,
      position: moduleItem.position,
      lessons: (lessonsByModule.get(String(moduleItem._id)) ?? []).sort(
        (a, b) => a.position - b.position,
      ),
    })),
    isAuthor,
    canEdit,
    canRead: canEdit || Boolean(enrollment),
    enrollment: enrollment
      ? {
          status: enrollment.status,
          completedLessonCount: enrollment.completedLessonCount,
          lastLessonId: enrollment.lastLessonId?.toString(),
          progress,
        }
      : null,
  }
}

export async function getCourseForEdit(user: SessionUser, courseId: string): Promise<CourseDetail> {
  const course = await findCourse(courseId)
  assertCourseOwner(course, user)
  const detail = await getCourseBySlug(course.slug, user)
  return detail
}

export async function createCourse(user: SessionUser, input: CreateCourseInput): Promise<string> {
  assertCanAuthor(user)
  await connectToDatabase()
  try {
    const course = await CourseModel.create({
      authorId: user.id,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      topic: input.topic,
      language: input.language,
      level: input.level,
      status: 'draft',
      lessonCount: 0,
      enrollmentCount: 0,
    })
    return String(course._id)
  } catch (error) {
    if (isDuplicate(error)) throw new AppError('SLUG_TAKEN')
    throw error
  }
}

export async function updateCourse(
  user: SessionUser,
  courseId: string,
  input: UpdateCourseInput,
): Promise<void> {
  const course = await findCourse(courseId)
  assertCourseOwner(course, user)
  const update: Record<string, unknown> = { ...input }
  if (input.topic === null) update.topic = undefined
  await CourseModel.updateOne({ _id: course._id }, { $set: update })
}

export async function publishCourse(user: SessionUser, courseId: string): Promise<void> {
  const course = await findCourse(courseId)
  assertCourseOwner(course, user)

  const [moduleCount, lessonCount] = await Promise.all([
    CourseModuleModel.countDocuments({ courseId: course._id }),
    LessonModel.countDocuments({ courseId: course._id }),
  ])
  if (moduleCount === 0 || lessonCount === 0) throw new AppError('CANNOT_PUBLISH_EMPTY')

  await CourseModel.updateOne(
    { _id: course._id },
    { $set: { status: 'published', lessonCount, publishedAt: course.publishedAt ?? new Date() } },
  )
}

export async function archiveCourse(user: SessionUser, courseId: string): Promise<void> {
  const course = await findCourse(courseId)
  assertCourseOwner(course, user)
  await CourseModel.updateOne({ _id: course._id }, { $set: { status: 'archived' } })
}

export async function createModule(
  user: SessionUser,
  courseId: string,
  input: CreateModuleInput,
): Promise<string> {
  const course = await findCourse(courseId)
  assertCourseOwner(course, user)
  await connectToDatabase()
  const position = await CourseModuleModel.countDocuments({ courseId: course._id })
  const courseModule = await CourseModuleModel.create({
    courseId: course._id,
    title: input.title,
    summary: input.summary,
    position,
  })
  return String(courseModule._id)
}

export async function updateModule(
  user: SessionUser,
  moduleId: string,
  input: UpdateModuleInput,
): Promise<void> {
  await connectToDatabase()
  const courseModule = await CourseModuleModel.findById(moduleId).lean<CourseModuleRecord | null>()
  if (!courseModule) throw new AppError('NOT_FOUND')
  const course = await findCourse(courseModule.courseId.toString())
  assertCourseOwner(course, user)
  const update: Record<string, unknown> = { ...input }
  if (input.summary === null) update.summary = undefined
  await CourseModuleModel.updateOne({ _id: courseModule._id }, { $set: update })
}

export async function deleteModule(user: SessionUser, moduleId: string): Promise<void> {
  await connectToDatabase()
  const courseModule = await CourseModuleModel.findById(moduleId).lean<CourseModuleRecord | null>()
  if (!courseModule) throw new AppError('NOT_FOUND')
  const course = await findCourse(courseModule.courseId.toString())
  assertCourseOwner(course, user)

  await LessonModel.deleteMany({ moduleId: courseModule._id })
  await CourseModuleModel.deleteOne({ _id: courseModule._id })
  await recomputeLessonCount(course._id)
}

export async function createLesson(
  user: SessionUser,
  moduleId: string,
  input: CreateLessonInput,
): Promise<string> {
  await connectToDatabase()
  const courseModule = await CourseModuleModel.findById(moduleId).lean<CourseModuleRecord | null>()
  if (!courseModule) throw new AppError('NOT_FOUND')
  const course = await findCourse(courseModule.courseId.toString())
  assertCourseOwner(course, user)

  const position = await LessonModel.countDocuments({ moduleId: courseModule._id })
  const lesson = await LessonModel.create({
    courseId: course._id,
    moduleId: courseModule._id,
    title: input.title,
    content: input.content,
    position,
    estimatedMinutes: input.estimatedMinutes,
  })
  await recomputeLessonCount(course._id)
  return String(lesson._id)
}

export async function updateLesson(
  user: SessionUser,
  lessonId: string,
  input: UpdateLessonInput,
): Promise<void> {
  await connectToDatabase()
  const lesson = await LessonModel.findById(lessonId).lean<LessonRecord | null>()
  if (!lesson) throw new AppError('LESSON_NOT_FOUND')
  const course = await findCourse(lesson.courseId.toString())
  assertCourseOwner(course, user)
  await LessonModel.updateOne({ _id: lesson._id }, { $set: input })
}

export async function deleteLesson(user: SessionUser, lessonId: string): Promise<void> {
  await connectToDatabase()
  const lesson = await LessonModel.findById(lessonId).lean<LessonRecord | null>()
  if (!lesson) throw new AppError('LESSON_NOT_FOUND')
  const course = await findCourse(lesson.courseId.toString())
  assertCourseOwner(course, user)

  await LessonModel.deleteOne({ _id: lesson._id })
  await LessonProgressModel.deleteMany({ lessonId: lesson._id })
  await recomputeLessonCount(course._id)
  await syncEnrollmentCounts(course._id, course.lessonCount)
}

export async function enrollInCourse(user: SessionUser, courseId: string): Promise<void> {
  assertCanParticipate(user)
  const course = await findCourse(courseId)
  if (course.status !== 'published') throw new AppError('COURSE_NOT_PUBLISHED')
  await connectToDatabase()

  const existing = await EnrollmentModel.findOne({ userId: user.id, courseId: course._id })
    .select('_id')
    .lean<{ _id: Types.ObjectId } | null>()
  if (existing) throw new AppError('ALREADY_ENROLLED')

  try {
    await EnrollmentModel.create({
      userId: user.id,
      courseId: course._id,
      status: 'active',
      completedLessonCount: 0,
      lastAccessedAt: new Date(),
    })
  } catch (error) {
    if (isDuplicate(error)) throw new AppError('ALREADY_ENROLLED')
    throw error
  }
  await CourseModel.updateOne({ _id: course._id }, { $inc: { enrollmentCount: 1 } })
}

export async function getLessonForViewer(
  courseSlug: string,
  lessonId: string,
  viewer: SessionUser | null,
): Promise<LessonView> {
  await connectToDatabase()
  const course = await CourseModel.findOne({ slug: courseSlug }).lean<CourseRecord | null>()
  if (!course) throw new AppError('COURSE_NOT_FOUND')

  const isAuthor = Boolean(viewer && course.authorId.toString() === viewer.id)
  const isAdmin = viewer?.role === 'admin'
  if (course.status !== 'published' && !isAuthor && !isAdmin) {
    throw new AppError('COURSE_NOT_PUBLISHED')
  }

  const lesson = await LessonModel.findOne({
    _id: lessonId,
    courseId: course._id,
  }).lean<LessonRecord | null>()
  if (!lesson) throw new AppError('LESSON_NOT_FOUND')

  const enrollment = viewer
    ? await EnrollmentModel.findOne({
        userId: viewer.id,
        courseId: course._id,
      }).lean<EnrollmentRecord | null>()
    : null
  if (!isAuthor && !isAdmin && !enrollment) throw new AppError('NOT_ENROLLED')

  const [courseModule, modules, lessons] = await Promise.all([
    CourseModuleModel.findById(lesson.moduleId).lean<CourseModuleRecord | null>(),
    CourseModuleModel.find({ courseId: course._id })
      .sort({ position: 1 })
      .lean<CourseModuleRecord[]>(),
    LessonModel.find({ courseId: course._id }).sort({ position: 1 }).lean<LessonRecord[]>(),
  ])

  const moduleOrder = new Map(modules.map((item, index) => [String(item._id), index]))
  const ordered = [...lessons].sort((a, b) => {
    const moduleDiff =
      (moduleOrder.get(a.moduleId.toString()) ?? 0) - (moduleOrder.get(b.moduleId.toString()) ?? 0)
    return moduleDiff !== 0 ? moduleDiff : a.position - b.position
  })
  const index = ordered.findIndex((item) => String(item._id) === lessonId)

  let completed = false
  if (viewer) {
    const progress = await LessonProgressModel.findOne({ userId: viewer.id, lessonId: lesson._id })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>()
    completed = Boolean(progress)
    if (enrollment) {
      await EnrollmentModel.updateOne(
        { _id: enrollment._id },
        { $set: { lastLessonId: lesson._id, lastAccessedAt: new Date() } },
      )
    }
  }

  return {
    id: String(lesson._id),
    courseId: String(course._id),
    courseSlug: course.slug,
    courseTitle: course.title,
    moduleTitle: courseModule?.title ?? '',
    title: lesson.title,
    content: lesson.content,
    position: lesson.position,
    estimatedMinutes: lesson.estimatedMinutes,
    completed,
    completedLessonCount: enrollment?.completedLessonCount ?? 0,
    lessonCount: course.lessonCount,
    prevLessonId: index > 0 ? String(ordered[index - 1]!._id) : undefined,
    nextLessonId:
      index >= 0 && index < ordered.length - 1 ? String(ordered[index + 1]!._id) : undefined,
    isAuthor: isAuthor || Boolean(isAdmin),
  }
}

export async function completeLesson(
  user: SessionUser,
  lessonId: string,
): Promise<{ completedLessonCount: number; status: 'active' | 'completed'; xpAwarded: boolean }> {
  assertCanParticipate(user)
  await connectToDatabase()
  const lesson = await LessonModel.findById(lessonId).lean<LessonRecord | null>()
  if (!lesson) throw new AppError('LESSON_NOT_FOUND')

  const course = await CourseModel.findById(lesson.courseId).lean<CourseRecord | null>()
  if (!course || course.status !== 'published') throw new AppError('COURSE_NOT_PUBLISHED')

  const enrollment = await EnrollmentModel.findOne({
    userId: user.id,
    courseId: course._id,
  }).lean<EnrollmentRecord | null>()
  if (!enrollment) throw new AppError('NOT_ENROLLED')

  let xpAwarded = false
  try {
    await LessonProgressModel.create({
      userId: user.id,
      courseId: course._id,
      lessonId: lesson._id,
    })
    const xp = await awardXp(user.id, 'lesson_completed', String(lesson._id))
    xpAwarded = xp.awarded
  } catch (error) {
    if (!isDuplicate(error)) throw error
  }

  const completedLessonCount = await LessonProgressModel.countDocuments({
    userId: user.id,
    courseId: course._id,
  })
  const status = completedLessonCount >= course.lessonCount ? 'completed' : 'active'

  await EnrollmentModel.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        completedLessonCount,
        status,
        lastLessonId: lesson._id,
        lastAccessedAt: new Date(),
        ...(status === 'completed' ? { completedAt: enrollment.completedAt ?? new Date() } : {}),
      },
    },
  )

  return { completedLessonCount, status, xpAwarded }
}

export async function countCourses(): Promise<number> {
  await connectToDatabase()
  return CourseModel.countDocuments({ status: { $ne: 'archived' } })
}

async function findCourse(courseId: string): Promise<CourseRecord> {
  await connectToDatabase()
  const course = await CourseModel.findById(courseId).lean<CourseRecord | null>()
  if (!course) throw new AppError('COURSE_NOT_FOUND')
  return course
}

function assertCourseOwner(course: CourseRecord, user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (course.authorId.toString() !== user.id && user.role !== 'admin')
    throw new AppError('FORBIDDEN')
}

async function recomputeLessonCount(courseId: Types.ObjectId): Promise<number> {
  const lessonCount = await LessonModel.countDocuments({ courseId })
  await CourseModel.updateOne({ _id: courseId }, { $set: { lessonCount } })
  await syncEnrollmentCounts(courseId, lessonCount)
  return lessonCount
}

async function syncEnrollmentCounts(courseId: Types.ObjectId, lessonCount: number): Promise<void> {
  if (lessonCount <= 0) return
  await EnrollmentModel.updateMany(
    { courseId, completedLessonCount: { $gte: lessonCount } },
    { $set: { status: 'completed', completedAt: new Date() } },
  )
}

function toCourseCard(course: CourseRecord, author: PublicUser | null | undefined): CourseCard {
  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    topic: course.topic,
    language: course.language,
    level: course.level,
    status: course.status,
    lessonCount: course.lessonCount,
    enrollmentCount: course.enrollmentCount,
    author: author ?? null,
    publishedAt: course.publishedAt?.toISOString(),
  }
}

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  )
}

function assertCanAuthor(user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (user.role !== 'educator' && user.role !== 'admin') throw new AppError('FORBIDDEN')
  if (user.ageBand !== 'adult') throw new AppError('NOT_ALLOWED')
}
