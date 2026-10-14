import mongoose from 'mongoose';

const postMediaSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  status: { type: String, enum: ['pending', 'ready', 'failed'], default: 'ready', index: true },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  publicId: { type: String, required: true, trim: true, maxlength: 512 },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  mimeType: { type: String, trim: true, maxlength: 120, default: '' },
  sizeBytes: { type: Number, min: 0, default: 0 },
  width: { type: Number, min: 0, default: null },
  height: { type: Number, min: 0, default: null },
  duration: { type: Number, min: 0, default: null },
  thumbnailUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  sortOrder: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

postMediaSchema.index({ postId: 1, sortOrder: 1 });

export const PostMedia = mongoose.models.PostMedia || mongoose.model('PostMedia', postMediaSchema);
export default PostMedia;
