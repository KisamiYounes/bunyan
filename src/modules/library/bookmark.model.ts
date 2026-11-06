import { Schema, model, models, type Model, type Types } from 'mongoose'
import { BOOKMARK_TARGET_TYPES, type BookmarkTargetType } from '@/shared/constants'

export interface BookmarkRecord {
  _id: Types.ObjectId
  userId: Types.ObjectId
  targetType: BookmarkTargetType
  targetId: Types.ObjectId
  createdAt: Date
}

const bookmarkSchema = new Schema<BookmarkRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: BOOKMARK_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

bookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true })
bookmarkSchema.index({ userId: 1, createdAt: -1 })

export const BookmarkModel: Model<BookmarkRecord> =
  (models.Bookmark as Model<BookmarkRecord>) ?? model<BookmarkRecord>('Bookmark', bookmarkSchema)
