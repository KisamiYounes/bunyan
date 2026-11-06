import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface PostLikeRecord {
  _id: Types.ObjectId
  postId: Types.ObjectId
  userId: Types.ObjectId
  createdAt: Date
}

const postLikeSchema = new Schema<PostLikeRecord>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true })

export const PostLikeModel: Model<PostLikeRecord> =
  (models.PostLike as Model<PostLikeRecord>) ?? model<PostLikeRecord>('PostLike', postLikeSchema)
