import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  COMMUNITY_ROLES,
  MEMBERSHIP_STATUSES,
  type CommunityRole,
  type MembershipStatus,
} from '@/shared/constants'

export interface MembershipRecord {
  _id: Types.ObjectId
  communityId: Types.ObjectId
  userId: Types.ObjectId
  role: CommunityRole
  status: MembershipStatus
  joinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const membershipSchema = new Schema<MembershipRecord>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: COMMUNITY_ROLES, default: 'member', required: true },
    status: { type: String, enum: MEMBERSHIP_STATUSES, default: 'active', required: true },
    joinedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

membershipSchema.index({ communityId: 1, userId: 1 }, { unique: true })
membershipSchema.index({ userId: 1, status: 1, updatedAt: -1 })
membershipSchema.index({ communityId: 1, role: 1, status: 1 })
membershipSchema.index({ communityId: 1, status: 1, createdAt: -1 })

export const MembershipModel: Model<MembershipRecord> =
  (models.Membership as Model<MembershipRecord>) ??
  model<MembershipRecord>('Membership', membershipSchema)
