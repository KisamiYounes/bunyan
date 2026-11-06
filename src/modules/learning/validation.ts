import { z } from 'zod'
import { locales } from '@/i18n/config'
import {
  CHAPTER_STATUSES,
  COURSE_LEVELS,
  MAX_CHAPTER_CONTENT,
  MAX_CHAPTER_TITLE,
  MAX_COURSE_DESCRIPTION,
  MAX_COURSE_SUMMARY,
  MAX_COURSE_TITLE,
  MAX_LESSON_CONTENT,
  MAX_LESSON_TITLE,
  MAX_MODULE_TITLE,
  MAX_PUBLICATION_DESCRIPTION,
  MAX_PUBLICATION_SUMMARY,
  MAX_PUBLICATION_TITLE,
  TOPICS,
} from '@/shared/constants'
import { SLUG_PATTERN } from '@/shared/utils/slug'

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug is too short')
  .max(60)
  .regex(SLUG_PATTERN, 'Slug may only contain lowercase letters, numbers and hyphens')

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(MAX_COURSE_TITLE),
  slug: slugSchema,
  summary: z.string().trim().min(10).max(MAX_COURSE_SUMMARY),
  description: z.string().trim().min(20).max(MAX_COURSE_DESCRIPTION),
  topic: z.enum(TOPICS).optional(),
  language: z.enum(locales).default('ar'),
  level: z.enum(COURSE_LEVELS).default('beginner'),
})

export const updateCourseSchema = z.object({
  title: z.string().trim().min(3).max(MAX_COURSE_TITLE).optional(),
  summary: z.string().trim().min(10).max(MAX_COURSE_SUMMARY).optional(),
  description: z.string().trim().min(20).max(MAX_COURSE_DESCRIPTION).optional(),
  topic: z.enum(TOPICS).nullable().optional(),
  language: z.enum(locales).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
})

export const createModuleSchema = z.object({
  title: z.string().trim().min(2).max(MAX_MODULE_TITLE),
  summary: z.string().trim().max(600).optional(),
})

export const updateModuleSchema = z.object({
  title: z.string().trim().min(2).max(MAX_MODULE_TITLE).optional(),
  summary: z.string().trim().max(600).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const createLessonSchema = z.object({
  title: z.string().trim().min(2).max(MAX_LESSON_TITLE),
  content: z.string().trim().min(1).max(MAX_LESSON_CONTENT),
  estimatedMinutes: z.number().int().min(1).max(600).default(5),
})

export const updateLessonSchema = z.object({
  title: z.string().trim().min(2).max(MAX_LESSON_TITLE).optional(),
  content: z.string().trim().min(1).max(MAX_LESSON_CONTENT).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  position: z.number().int().min(0).optional(),
})

export const createPublicationSchema = z.object({
  title: z.string().trim().min(3).max(MAX_PUBLICATION_TITLE),
  slug: slugSchema,
  summary: z.string().trim().min(10).max(MAX_PUBLICATION_SUMMARY),
  description: z.string().trim().min(20).max(MAX_PUBLICATION_DESCRIPTION),
  topic: z.enum(TOPICS).optional(),
  language: z.enum(locales).default('ar'),
})

export const updatePublicationSchema = z.object({
  title: z.string().trim().min(3).max(MAX_PUBLICATION_TITLE).optional(),
  summary: z.string().trim().min(10).max(MAX_PUBLICATION_SUMMARY).optional(),
  description: z.string().trim().min(20).max(MAX_PUBLICATION_DESCRIPTION).optional(),
  topic: z.enum(TOPICS).nullable().optional(),
  language: z.enum(locales).optional(),
})

export const createChapterSchema = z.object({
  title: z.string().trim().min(2).max(MAX_CHAPTER_TITLE),
  content: z.string().trim().min(1).max(MAX_CHAPTER_CONTENT),
})

export const updateChapterSchema = z.object({
  title: z.string().trim().min(2).max(MAX_CHAPTER_TITLE).optional(),
  content: z.string().trim().min(1).max(MAX_CHAPTER_CONTENT).optional(),
  status: z.enum(CHAPTER_STATUSES).optional(),
  position: z.number().int().min(0).optional(),
})

export const saveReadingProgressSchema = z.object({
  chapterId: z.string().regex(/^[a-f0-9]{24}$/i),
  scroll: z.number().min(0).max(1),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type CreateModuleInput = z.infer<typeof createModuleSchema>
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>
export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
export type CreatePublicationInput = z.infer<typeof createPublicationSchema>
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>
export type CreateChapterInput = z.infer<typeof createChapterSchema>
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>
export type SaveReadingProgressInput = z.infer<typeof saveReadingProgressSchema>
