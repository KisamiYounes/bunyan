import { z } from 'zod'
import { REPORT_REASONS, REPORT_TARGET_TYPES } from '@/shared/constants'

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().min(1).max(80),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
})

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed', 'escalated']),
})

export const adminUserActionSchema = z.object({
  action: z.enum(['suspend', 'restore']),
})

export const adminCommunityActionSchema = z.object({
  action: z.enum(['archive', 'suspend', 'activate']),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
export type ResolveReportInput = z.infer<typeof resolveReportSchema>
