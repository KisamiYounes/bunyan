import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { AppError } from '@/shared/errors/app-error'
import type { PublicUser, SessionUser } from '@/modules/identity/dto'
import { getUsersByIds } from '@/modules/identity/user.service'
import { escapeRegExp } from '@/shared/utils/pagination'
import type { PublicationStatus, Topic } from '@/shared/constants'
import { PublicationModel, type PublicationRecord } from './publication.model'
import { ChapterModel, type ChapterRecord } from './chapter.model'
import { ReadingProgressModel, type ReadingProgressRecord } from './reading-progress.model'
import type {
  CreateChapterInput,
  CreatePublicationInput,
  UpdateChapterInput,
  UpdatePublicationInput,
} from './validation'

export interface PublicationCard {
  id: string
  title: string
  slug: string
  summary: string
  topic?: Topic
  language: string
  status: PublicationStatus
  chapterCount: number
  author: PublicUser | null
  publishedAt?: string
  updatedAt: string
}

export interface ChapterSummary {
  id: string
  title: string
  position: number
  status: 'draft' | 'published'
  publishedAt?: string
  /** Present only for the author or an admin so reader payloads never include drafts. */
  content?: string
}

export interface PublicationDetail extends PublicationCard {
  description: string
  chapters: ChapterSummary[]
  isAuthor: boolean
  canEdit: boolean
  progress: { chapterId: string; scroll: number } | null
}

export interface ChapterView {
  id: string
  publicationId: string
  publicationSlug: string
  publicationTitle: string
  title: string
  content: string
  position: number
  status: 'draft' | 'published'
  prevChapterId?: string
  nextChapterId?: string
  scroll: number
  isAuthor: boolean
}

export async function listPublications(params: {
  page?: number
  limit?: number
  search?: string
  topic?: Topic
  authorId?: string
}): Promise<{ items: PublicationCard[]; total: number; page: number; limit: number }> {
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

  const [publications, total] = await Promise.all([
    PublicationModel.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<PublicationRecord[]>(),
    PublicationModel.countDocuments(filter),
  ])
  const authors = await getUsersByIds(publications.map((item) => item.authorId.toString()))
  return {
    items: publications.map((item) =>
      toPublicationCard(item, authors.get(item.authorId.toString())),
    ),
    total,
    page,
    limit,
  }
}

export async function listAuthorPublications(user: SessionUser): Promise<PublicationCard[]> {
  await connectToDatabase()
  const publications = await PublicationModel.find({ authorId: user.id })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean<PublicationRecord[]>()
  const authors = await getUsersByIds([user.id])
  const author = authors.get(user.id) ?? null
  return publications.map((item) => toPublicationCard(item, author))
}

export async function getPublicationBySlug(
  slug: string,
  viewer: SessionUser | null,
): Promise<PublicationDetail> {
  await connectToDatabase()
  const publication = await PublicationModel.findOne({ slug }).lean<PublicationRecord | null>()
  if (!publication) throw new AppError('PUBLICATION_NOT_FOUND')

  const isAuthor = Boolean(viewer && publication.authorId.toString() === viewer.id)
  const canEdit = isAuthor || viewer?.role === 'admin'
  if (publication.status !== 'published' && !canEdit) {
    throw new AppError('PUBLICATION_NOT_PUBLISHED')
  }

  const chapterFilter = canEdit
    ? { publicationId: publication._id }
    : { publicationId: publication._id, status: 'published' as const }
  const [chapters, progress, authors] = await Promise.all([
    ChapterModel.find(chapterFilter).sort({ position: 1 }).lean<ChapterRecord[]>(),
    viewer
      ? ReadingProgressModel.findOne({
          userId: viewer.id,
          publicationId: publication._id,
        }).lean<ReadingProgressRecord | null>()
      : Promise.resolve(null),
    getUsersByIds([publication.authorId.toString()]),
  ])

  return {
    ...toPublicationCard(publication, authors.get(publication.authorId.toString())),
    description: publication.description,
    chapters: chapters.map((chapter) => ({
      id: String(chapter._id),
      title: chapter.title,
      position: chapter.position,
      status: chapter.status,
      publishedAt: chapter.publishedAt?.toISOString(),
      ...(canEdit ? { content: chapter.content } : {}),
    })),
    isAuthor,
    canEdit: Boolean(canEdit),
    progress: progress
      ? { chapterId: progress.lastChapterId.toString(), scroll: progress.scroll }
      : null,
  }
}

export async function getPublicationForEdit(
  user: SessionUser,
  publicationId: string,
): Promise<PublicationDetail> {
  const publication = await findPublication(publicationId)
  assertPublicationOwner(publication, user)
  return getPublicationBySlug(publication.slug, user)
}

export async function getChapterForViewer(
  publicationSlug: string,
  chapterId: string,
  viewer: SessionUser | null,
): Promise<ChapterView> {
  await connectToDatabase()
  const publication = await PublicationModel.findOne({
    slug: publicationSlug,
  }).lean<PublicationRecord | null>()
  if (!publication) throw new AppError('PUBLICATION_NOT_FOUND')

  const isAuthor = Boolean(viewer && publication.authorId.toString() === viewer.id)
  const canEdit = isAuthor || viewer?.role === 'admin'
  if (publication.status !== 'published' && !canEdit) {
    throw new AppError('PUBLICATION_NOT_PUBLISHED')
  }

  const chapter = await ChapterModel.findOne({
    _id: chapterId,
    publicationId: publication._id,
  }).lean<ChapterRecord | null>()
  if (!chapter) throw new AppError('CHAPTER_NOT_FOUND')
  if (chapter.status !== 'published' && !canEdit) throw new AppError('CHAPTER_NOT_FOUND')

  const chapterFilter = canEdit
    ? { publicationId: publication._id }
    : { publicationId: publication._id, status: 'published' as const }
  const chapters = await ChapterModel.find(chapterFilter)
    .sort({ position: 1 })
    .lean<ChapterRecord[]>()
  const index = chapters.findIndex((item) => String(item._id) === chapterId)

  const progress = viewer
    ? await ReadingProgressModel.findOne({
        userId: viewer.id,
        publicationId: publication._id,
      }).lean<ReadingProgressRecord | null>()
    : null

  return {
    id: String(chapter._id),
    publicationId: String(publication._id),
    publicationSlug: publication.slug,
    publicationTitle: publication.title,
    title: chapter.title,
    content: chapter.content,
    position: chapter.position,
    status: chapter.status,
    prevChapterId: index > 0 ? String(chapters[index - 1]!._id) : undefined,
    nextChapterId:
      index >= 0 && index < chapters.length - 1 ? String(chapters[index + 1]!._id) : undefined,
    scroll: progress?.lastChapterId.toString() === chapterId ? progress.scroll : 0,
    isAuthor: canEdit,
  }
}

export async function createPublication(
  user: SessionUser,
  input: CreatePublicationInput,
): Promise<string> {
  assertCanAuthor(user)
  await connectToDatabase()
  try {
    const publication = await PublicationModel.create({
      authorId: user.id,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      topic: input.topic,
      language: input.language,
      status: 'draft',
      chapterCount: 0,
    })
    return String(publication._id)
  } catch (error) {
    if (isDuplicate(error)) throw new AppError('SLUG_TAKEN')
    throw error
  }
}

export async function updatePublication(
  user: SessionUser,
  publicationId: string,
  input: UpdatePublicationInput,
): Promise<void> {
  const publication = await findPublication(publicationId)
  assertPublicationOwner(publication, user)
  const update: Record<string, unknown> = { ...input }
  if (input.topic === null) update.topic = undefined
  await PublicationModel.updateOne({ _id: publication._id }, { $set: update })
}

export async function publishPublication(user: SessionUser, publicationId: string): Promise<void> {
  const publication = await findPublication(publicationId)
  assertPublicationOwner(publication, user)
  const chapterCount = await ChapterModel.countDocuments({
    publicationId: publication._id,
    status: 'published',
  })
  if (chapterCount === 0) throw new AppError('CANNOT_PUBLISH_EMPTY')

  await PublicationModel.updateOne(
    { _id: publication._id },
    {
      $set: {
        status: 'published',
        chapterCount,
        publishedAt: publication.publishedAt ?? new Date(),
      },
    },
  )
}

export async function archivePublication(user: SessionUser, publicationId: string): Promise<void> {
  const publication = await findPublication(publicationId)
  assertPublicationOwner(publication, user)
  await PublicationModel.updateOne({ _id: publication._id }, { $set: { status: 'archived' } })
}

export async function createChapter(
  user: SessionUser,
  publicationId: string,
  input: CreateChapterInput,
): Promise<string> {
  const publication = await findPublication(publicationId)
  assertPublicationOwner(publication, user)
  await connectToDatabase()
  const position = await ChapterModel.countDocuments({ publicationId: publication._id })
  const chapter = await ChapterModel.create({
    publicationId: publication._id,
    title: input.title,
    content: input.content,
    position,
    status: 'draft',
  })
  return String(chapter._id)
}

export async function updateChapter(
  user: SessionUser,
  chapterId: string,
  input: UpdateChapterInput,
): Promise<void> {
  await connectToDatabase()
  const chapter = await ChapterModel.findById(chapterId).lean<ChapterRecord | null>()
  if (!chapter) throw new AppError('CHAPTER_NOT_FOUND')
  const publication = await findPublication(chapter.publicationId.toString())
  assertPublicationOwner(publication, user)

  const update: Record<string, unknown> = { ...input }
  if (input.status === 'published') update.publishedAt = chapter.publishedAt ?? new Date()
  if (input.status === 'draft') update.publishedAt = undefined

  await ChapterModel.updateOne({ _id: chapter._id }, { $set: update })
  if (input.status) await recomputeChapterCount(publication._id)
}

export async function deleteChapter(user: SessionUser, chapterId: string): Promise<void> {
  await connectToDatabase()
  const chapter = await ChapterModel.findById(chapterId).lean<ChapterRecord | null>()
  if (!chapter) throw new AppError('CHAPTER_NOT_FOUND')
  const publication = await findPublication(chapter.publicationId.toString())
  assertPublicationOwner(publication, user)

  await ChapterModel.deleteOne({ _id: chapter._id })
  await ReadingProgressModel.updateMany(
    { publicationId: publication._id, lastChapterId: chapter._id },
    { $set: { scroll: 0 } },
  )
  await recomputeChapterCount(publication._id)
}

export async function saveReadingProgress(
  user: SessionUser,
  publicationId: string,
  input: { chapterId: string; scroll: number },
): Promise<void> {
  await connectToDatabase()
  const publication = await findPublication(publicationId)
  const isAuthor = publication.authorId.toString() === user.id
  if (publication.status !== 'published' && !isAuthor && user.role !== 'admin') {
    throw new AppError('PUBLICATION_NOT_PUBLISHED')
  }

  const chapter = await ChapterModel.findOne({
    _id: input.chapterId,
    publicationId: publication._id,
  }).lean<ChapterRecord | null>()
  if (!chapter) throw new AppError('CHAPTER_NOT_FOUND')
  if (chapter.status !== 'published' && !isAuthor && user.role !== 'admin') {
    throw new AppError('CHAPTER_NOT_FOUND')
  }

  await ReadingProgressModel.findOneAndUpdate(
    { userId: user.id, publicationId: publication._id },
    {
      $set: {
        lastChapterId: chapter._id,
        scroll: input.scroll,
      },
    },
    { upsert: true, returnDocument: 'after' },
  )
}

export async function countPublications(): Promise<number> {
  await connectToDatabase()
  return PublicationModel.countDocuments({ status: 'published' })
}

async function findPublication(publicationId: string): Promise<PublicationRecord> {
  await connectToDatabase()
  const publication = await PublicationModel.findById(
    publicationId,
  ).lean<PublicationRecord | null>()
  if (!publication) throw new AppError('PUBLICATION_NOT_FOUND')
  return publication
}

async function recomputeChapterCount(publicationId: PublicationRecord['_id']): Promise<void> {
  const chapterCount = await ChapterModel.countDocuments({
    publicationId,
    status: 'published',
  })
  await PublicationModel.updateOne({ _id: publicationId }, { $set: { chapterCount } })
}

function assertPublicationOwner(publication: PublicationRecord, user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (publication.authorId.toString() !== user.id && user.role !== 'admin') {
    throw new AppError('FORBIDDEN')
  }
}

function assertCanAuthor(user: SessionUser): void {
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED')
  if (user.role !== 'educator' && user.role !== 'admin') throw new AppError('FORBIDDEN')
  if (user.ageBand !== 'adult') throw new AppError('NOT_ALLOWED')
}

function toPublicationCard(
  publication: PublicationRecord,
  author: PublicUser | null | undefined,
): PublicationCard {
  return {
    id: String(publication._id),
    title: publication.title,
    slug: publication.slug,
    summary: publication.summary,
    topic: publication.topic,
    language: publication.language,
    status: publication.status,
    chapterCount: publication.chapterCount,
    author: author ?? null,
    publishedAt: publication.publishedAt?.toISOString(),
    updatedAt: publication.updatedAt.toISOString(),
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
