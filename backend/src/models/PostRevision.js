import mongoose from 'mongoose';

const postRevisionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  version: { type: Number, required: true },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
postRevisionSchema.index({ postId: 1, version: 1 }, { unique: true });

export const PostRevision = mongoose.models.PostRevision || mongoose.model('PostRevision', postRevisionSchema);
export default PostRevision;
