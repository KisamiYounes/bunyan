import { Schema, model, models, type Model, type Types } from 'mongoose'
import { XP_POINTS, type XpKind } from '@/shared/constants'

export interface XpEventRecord {
  _id: Types.ObjectId
  userId: Types.ObjectId
  kind: XpKind
  refId: Types.ObjectId
  points: number
  createdAt: Date
}

const xpEventSchema = new Schema<XpEventRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: Object.keys(XP_POINTS), required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    points: { type: Number, required: true, min: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

xpEventSchema.index({ userId: 1, createdAt: -1 })
xpEventSchema.index({ userId: 1, kind: 1, refId: 1 }, { unique: true })

export const XpEventModel: Model<XpEventRecord> =
  (models.XpEvent as Model<XpEventRecord>) ?? model<XpEventRecord>('XpEvent', xpEventSchema)
