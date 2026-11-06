import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface AuditLogRecord {
  _id: Types.ObjectId
  actorId: Types.ObjectId
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
  ipHash?: string
  createdAt: Date
}

const auditLogSchema = new Schema<AuditLogRecord>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, maxlength: 80 },
    metadata: { type: Schema.Types.Mixed },
    ipHash: { type: String, maxlength: 128 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1 })

export const AuditLogModel: Model<AuditLogRecord> =
  (models.AuditLog as Model<AuditLogRecord>) ?? model<AuditLogRecord>('AuditLog', auditLogSchema)
