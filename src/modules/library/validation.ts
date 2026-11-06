import { z } from 'zod'
import { BOOKMARK_TARGET_TYPES, FOLLOW_TARGET_TYPES } from '@/shared/constants'

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const bookmarkSchema = z.object({
  targetType: z.enum(BOOKMARK_TARGET_TYPES),
  targetId: objectId,
})

export const followSchema = z.object({
  targetType: z.enum(FOLLOW_TARGET_TYPES),
  targetId: objectId,
})

export type BookmarkInput = z.infer<typeof bookmarkSchema>
export type FollowInput = z.infer<typeof followSchema>
