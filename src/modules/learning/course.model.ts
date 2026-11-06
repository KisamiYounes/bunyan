import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  COURSE_LEVELS,
  COURSE_STATUSES,
  TOPICS,
  type CourseLevel,
  type CourseStatus,
  type Topic,
} from '@/shared/constants'
import type { Locale } from '@/i18n/config'

export interface CourseRecord {
  _id: Types.ObjectId
  authorId: Types.ObjectId
  title: string
  slug: string
  summary: string
  description: string
  topic?: Topic
  language: Locale
  level: CourseLevel
  status: CourseStatus
  lessonCount: number
  enrollmentCount: number
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const courseSchema = new Schema<CourseRecord>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    description: { type: String, required: true, trim: true, maxlength: 8000 },
    topic: { type: String, enum: TOPICS },
    language: { type: String, enum: ['ar', 'en', 'fr'], default: 'ar', required: true },
    level: { type: String, enum: COURSE_LEVELS, default: 'beginner', required: true },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft', required: true },
    lessonCount: { type: Number, default: 0, min: 0, required: true },
    enrollmentCount: { type: Number, default: 0, min: 0, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

courseSchema.index({ slug: 1 }, { unique: true })
courseSchema.index({ status: 1, publishedAt: -1 })
courseSchema.index({ authorId: 1, status: 1, updatedAt: -1 })
courseSchema.index({ topic: 1, status: 1 })

export const CourseModel: Model<CourseRecord> =
  (models.Course as Model<CourseRecord>) ?? model<CourseRecord>('Course', courseSchema)
