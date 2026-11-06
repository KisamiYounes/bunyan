import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface LessonRecord {
  _id: Types.ObjectId
  courseId: Types.ObjectId
  moduleId: Types.ObjectId
  title: string
  content: string
  position: number
  estimatedMinutes: number
  createdAt: Date
  updatedAt: Date
}

const lessonSchema = new Schema<LessonRecord>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
    content: { type: String, required: true, minlength: 1, maxlength: 60000 },
    position: { type: Number, required: true, min: 0 },
    estimatedMinutes: { type: Number, default: 5, min: 1, max: 600, required: true },
  },
  { timestamps: true, versionKey: false },
)

lessonSchema.index({ courseId: 1, position: 1 })
lessonSchema.index({ moduleId: 1, position: 1 })

export const LessonModel: Model<LessonRecord> =
  (models.Lesson as Model<LessonRecord>) ?? model<LessonRecord>('Lesson', lessonSchema)
