import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface LessonProgressRecord {
  _id: Types.ObjectId
  userId: Types.ObjectId
  courseId: Types.ObjectId
  lessonId: Types.ObjectId
  completedAt: Date
}

const lessonProgressSchema = new Schema<LessonProgressRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completedAt: { type: Date, default: () => new Date(), required: true },
  },
  { timestamps: false, versionKey: false },
)

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })
lessonProgressSchema.index({ userId: 1, courseId: 1, completedAt: 1 })

export const LessonProgressModel: Model<LessonProgressRecord> =
  (models.LessonProgress as Model<LessonProgressRecord>) ??
  model<LessonProgressRecord>('LessonProgress', lessonProgressSchema)
