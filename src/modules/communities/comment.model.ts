import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface CommentRecord {
  _id: Types.ObjectId
  postId: Types.ObjectId
  communityId: Types.ObjectId
  authorId: Types.ObjectId
  body: string
  status: 'published' | 'removed'
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<CommentRecord>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 3000 },
    status: { type: String, enum: ['published', 'removed'], default: 'published', required: true },
  },
  { timestamps: true, versionKey: false },
)

commentSchema.index({ postId: 1, status: 1, createdAt: 1 })
commentSchema.index({ authorId: 1, createdAt: -1 })
commentSchema.index({ communityId: 1, createdAt: -1 })

export const CommentModel: Model<CommentRecord> =
  (models.Comment as Model<CommentRecord>) ?? model<CommentRecord>('Comment', commentSchema)
