import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface PostRecord {
  _id: Types.ObjectId
  communityId: Types.ObjectId
  authorId: Types.ObjectId
  title?: string
  body: string
  likeCount: number
  commentCount: number
  status: 'published' | 'removed'
  createdAt: Date
  updatedAt: Date
}

const postSchema = new Schema<PostRecord>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 10000 },
    likeCount: { type: Number, default: 0, min: 0, required: true },
    commentCount: { type: Number, default: 0, min: 0, required: true },
    status: { type: String, enum: ['published', 'removed'], default: 'published', required: true },
  },
  { timestamps: true, versionKey: false },
)

postSchema.index({ communityId: 1, status: 1, createdAt: -1 })
postSchema.index({ authorId: 1, createdAt: -1 })
postSchema.index({ status: 1, createdAt: -1 })

export const PostModel: Model<PostRecord> =
  (models.Post as Model<PostRecord>) ?? model<PostRecord>('Post', postSchema)
