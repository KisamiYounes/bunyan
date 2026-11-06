import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose'
import {
  ACCOUNT_STATUSES,
  AGE_BANDS,
  PLATFORM_ROLES,
  type AccountStatus,
  type AgeBand,
  type PlatformRole,
} from '@/shared/constants'
import type { Locale } from '@/i18n/config'

export interface UserRecord {
  _id: Types.ObjectId
  email: string
  username: string
  name: string
  passwordHash: string
  role: PlatformRole
  status: AccountStatus
  locale: Locale
  bio: string
  avatarUrl?: string
  birthYear?: number
  ageBand: AgeBand
  guardianConsentAt?: Date
  xp: number
  level: number
  profileVisibility: 'public' | 'members'
  sessionVersion: number
  createdAt: Date
  updatedAt: Date
}

export type UserDocument = HydratedDocument<UserRecord>

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    username: { type: String, required: true, trim: true, lowercase: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: PLATFORM_ROLES, default: 'learner', required: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active', required: true },
    locale: { type: String, enum: ['ar', 'en', 'fr'], default: 'ar', required: true },
    bio: { type: String, default: '', maxlength: 600 },
    avatarUrl: { type: String, maxlength: 500 },
    birthYear: { type: Number, min: 1900 },
    ageBand: { type: String, enum: AGE_BANDS, default: 'unknown', required: true },
    guardianConsentAt: { type: Date },
    xp: { type: Number, default: 0, min: 0, required: true },
    level: { type: Number, default: 1, min: 1, required: true },
    profileVisibility: {
      type: String,
      enum: ['public', 'members'],
      default: 'public',
      required: true,
    },
    sessionVersion: { type: Number, default: 0, min: 0, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash
        return ret
      },
    },
  },
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })
userSchema.index({ role: 1, status: 1 })
userSchema.index({ xp: -1 })

export const UserModel: Model<UserRecord> =
  (models.User as Model<UserRecord>) ?? model<UserRecord>('User', userSchema)
