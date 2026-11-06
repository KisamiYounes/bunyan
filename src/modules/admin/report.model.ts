import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from '@/shared/constants'

export interface ReportRecord {
  _id: Types.ObjectId
  reporterId: Types.ObjectId
  targetType: ReportTargetType
  targetId: string
  communityId?: Types.ObjectId
  targetLabel: string
  reason: ReportReason
  details?: string
  status: ReportStatus
  resolvedBy?: Types.ObjectId
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const reportSchema = new Schema<ReportRecord>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: String, required: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
    targetLabel: { type: String, required: true, maxlength: 200 },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'open', required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

reportSchema.index({ status: 1, createdAt: -1 })
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true })
reportSchema.index({ communityId: 1, status: 1 })

export const ReportModel: Model<ReportRecord> =
  (models.Report as Model<ReportRecord>) ?? model<ReportRecord>('Report', reportSchema)
