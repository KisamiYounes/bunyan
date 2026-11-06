import { Schema, model, models, type Model, type Types } from 'mongoose'
import { CHAPTER_STATUSES, type ChapterStatus } from '@/shared/constants'

export interface ChapterRecord {
  _id: Types.ObjectId
  publicationId: Types.ObjectId
  title: string
  content: string
  position: number
  status: ChapterStatus
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const chapterSchema = new Schema<ChapterRecord>(
  {
    publicationId: { type: Schema.Types.ObjectId, ref: 'Publication', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    content: { type: String, required: true, minlength: 1, maxlength: 80000 },
    position: { type: Number, required: true, min: 0 },
    status: { type: String, enum: CHAPTER_STATUSES, default: 'draft', required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

chapterSchema.index({ publicationId: 1, position: 1 })
chapterSchema.index({ publicationId: 1, status: 1, position: 1 })

export const ChapterModel: Model<ChapterRecord> =
  (models.Chapter as Model<ChapterRecord>) ?? model<ChapterRecord>('Chapter', chapterSchema)
