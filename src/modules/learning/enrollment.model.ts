import { Schema, model, models, type Model, type Types } from 'mongoose'
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from '@/shared/constants'

export interface EnrollmentRecord {
  _id: Types.ObjectId
  userId: Types.ObjectId
  courseId: Types.ObjectId
  status: EnrollmentStatus
  completedLessonCount: number
  lastLessonId?: Types.ObjectId
  lastAccessedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const enrollmentSchema = new Schema<EnrollmentRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'active', required: true },
    completedLessonCount: { type: Number, default: 0, min: 0, required: true },
    lastLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    lastAccessedAt: { type: Date, default: () => new Date(), required: true },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })
enrollmentSchema.index({ courseId: 1, status: 1 })
enrollmentSchema.index({ userId: 1, updatedAt: -1 })

export const EnrollmentModel: Model<EnrollmentRecord> =
  (models.Enrollment as Model<EnrollmentRecord>) ??
  model<EnrollmentRecord>('Enrollment', enrollmentSchema)
