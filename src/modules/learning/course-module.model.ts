import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface CourseModuleRecord {
  _id: Types.ObjectId
  courseId: Types.ObjectId
  title: string
  summary?: string
  position: number
  createdAt: Date
  updatedAt: Date
}

const courseModuleSchema = new Schema<CourseModuleRecord>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    summary: { type: String, trim: true, maxlength: 600 },
    position: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false },
)

courseModuleSchema.index({ courseId: 1, position: 1 })

export const CourseModuleModel: Model<CourseModuleRecord> =
  (models.CourseModule as Model<CourseModuleRecord>) ??
  model<CourseModuleRecord>('CourseModule', courseModuleSchema)
