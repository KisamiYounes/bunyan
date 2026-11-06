import { z } from 'zod'
import { locales } from '@/i18n/config'
import {
  MAX_COMMENT_LENGTH,
  MAX_COMMUNITY_DESCRIPTION,
  MAX_POST_LENGTH,
  TOPICS,
} from '@/shared/constants'
import { SLUG_PATTERN } from '@/shared/utils/slug'

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3, 'Name is too short').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug is too short')
    .max(60)
    .regex(SLUG_PATTERN, 'Slug may only contain lowercase letters, numbers and hyphens'),
  description: z.string().trim().min(10, 'Description is too short').max(MAX_COMMUNITY_DESCRIPTION),
  visibility: z.enum(['public', 'private']),
  topic: z.enum(TOPICS).optional(),
  language: z.enum(locales).default('ar'),
  rules: z.string().trim().max(4000).optional(),
})

export const createPostSchema = z.object({
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1, 'Write something first').max(MAX_POST_LENGTH),
})

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Write something first').max(MAX_COMMENT_LENGTH),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['moderator', 'member']),
})

export const approveMembershipSchema = z.object({
  decision: z.enum(['approve', 'reject']),
})

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
