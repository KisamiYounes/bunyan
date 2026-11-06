import { Schema, model, models, type Model, type Types } from 'mongoose'
import { FOLLOW_TARGET_TYPES, type FollowTargetType } from '@/shared/constants'

export interface FollowRecord {
  _id: Types.ObjectId
  followerId: Types.ObjectId
  targetType: FollowTargetType
  targetId: Types.ObjectId
  createdAt: Date
}

const followSchema = new Schema<FollowRecord>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: FOLLOW_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

followSchema.index({ followerId: 1, targetType: 1, targetId: 1 }, { unique: true })
followSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })

export const FollowModel: Model<FollowRecord> =
  (models.Follow as Model<FollowRecord>) ?? model<FollowRecord>('Follow', followSchema)
