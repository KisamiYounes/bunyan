import { connectToDatabase } from '@/infrastructure/database/mongoose'
import { logger } from '@/infrastructure/logging/logger'
import { AuditLogModel, type AuditLogRecord } from './audit-log.model'

export interface AuditInput {
  actorId: string
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
}

/**
 * Audit logging must never break the operation it records. Failures are logged and swallowed.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await connectToDatabase()
    await AuditLogModel.create(input)
  } catch (error) {
    logger.error('Failed to write audit log', {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function listAuditLogs(limit = 50): Promise<AuditLogRecord[]> {
  await connectToDatabase()
  return AuditLogModel.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(200, limit))
    .lean<AuditLogRecord[]>()
}
