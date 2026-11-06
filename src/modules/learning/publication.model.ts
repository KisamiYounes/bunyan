import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  PUBLICATION_STATUSES,
  TOPICS,
  type PublicationStatus,
  type Topic,
} from '@/shared/constants'
import type { Locale } from '@/i18n/config'

export interface PublicationRecord {
  _id: Types.ObjectId
  authorId: Types.ObjectId
  title: string
  slug: string
  summary: string
  description: string
  topic?: Topic
  language: Locale
  status: PublicationStatus
  chapterCount: number
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const publicationSchema = new Schema<PublicationRecord>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 90 },
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    description: { type: String, required: true, trim: true, maxlength: 8000 },
    topic: { type: String, enum: TOPICS },
    language: { type: String, enum: ['ar', 'en', 'fr'], default: 'ar', required: true },
    status: { type: String, enum: PUBLICATION_STATUSES, default: 'draft', required: true },
    chapterCount: { type: Number, default: 0, min: 0, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

publicationSchema.index({ slug: 1 }, { unique: true })
publicationSchema.index({ status: 1, publishedAt: -1 })
publicationSchema.index({ authorId: 1, status: 1, updatedAt: -1 })

export const PublicationModel: Model<PublicationRecord> =
  (models.Publication as Model<PublicationRecord>) ??
  model<PublicationRecord>('Publication', publicationSchema)
