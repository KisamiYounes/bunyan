import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  COMMUNITY_STATUSES,
  COMMUNITY_VISIBILITIES,
  TOPICS,
  type CommunityStatus,
  type CommunityVisibility,
  type Topic,
} from '@/shared/constants'
import type { Locale } from '@/i18n/config'

export interface CommunityRecord {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string
  visibility: CommunityVisibility
  ownerId: Types.ObjectId
  academyId?: Types.ObjectId
  topic?: Topic
  language: Locale
  memberCount: number
  postCount: number
  rules?: string
  status: CommunityStatus
  createdAt: Date
  updatedAt: Date
}

const communitySchema = new Schema<CommunityRecord>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    visibility: { type: String, enum: COMMUNITY_VISIBILITIES, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    academyId: { type: Schema.Types.ObjectId, ref: 'Academy' },
    topic: { type: String, enum: TOPICS },
    language: { type: String, enum: ['ar', 'en', 'fr'], default: 'ar', required: true },
    memberCount: { type: Number, default: 0, min: 0, required: true },
    postCount: { type: Number, default: 0, min: 0, required: true },
    rules: { type: String, maxlength: 4000 },
    status: { type: String, enum: COMMUNITY_STATUSES, default: 'active', required: true },
  },
  { timestamps: true, versionKey: false },
)

communitySchema.index({ slug: 1 }, { unique: true })
communitySchema.index({ visibility: 1, status: 1, memberCount: -1 })
communitySchema.index({ ownerId: 1 })
communitySchema.index({ academyId: 1 }, { sparse: true })
communitySchema.index({ topic: 1, status: 1 })

export const CommunityModel: Model<CommunityRecord> =
  (models.Community as Model<CommunityRecord>) ??
  model<CommunityRecord>('Community', communitySchema)
