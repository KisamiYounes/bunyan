import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface ReadingProgressRecord {
  _id: Types.ObjectId
  userId: Types.ObjectId
  publicationId: Types.ObjectId
  lastChapterId: Types.ObjectId
  /** Fraction of the chapter scrolled, 0..1. */
  scroll: number
  updatedAt: Date
}

const readingProgressSchema = new Schema<ReadingProgressRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publicationId: { type: Schema.Types.ObjectId, ref: 'Publication', required: true },
    lastChapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    scroll: { type: Number, default: 0, min: 0, max: 1, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false },
)

readingProgressSchema.index({ userId: 1, publicationId: 1 }, { unique: true })
readingProgressSchema.index({ userId: 1, updatedAt: -1 })

export const ReadingProgressModel: Model<ReadingProgressRecord> =
  (models.ReadingProgress as Model<ReadingProgressRecord>) ??
  model<ReadingProgressRecord>('ReadingProgress', readingProgressSchema)
