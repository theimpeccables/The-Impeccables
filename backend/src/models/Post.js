import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, trim: true, lowercase: true, maxlength: 220, index: true },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  contentType: { type: String, enum: ['artwork', 'photography', 'reel', 'video', 'article', 'poster', 'event_coverage'], required: true },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'published', 'unpublished'], default: 'draft', index: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  associatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  articleContent: { type: String, maxlength: 100_000, default: '' },
  publishedAt: { type: Date, default: null, index: true },
  scheduledPublishAt: { type: Date, default: null },
  viewCount: { type: Number, min: 0, default: 0 },
  isFeatured: { type: Boolean, default: false, index: true },
}, { timestamps: true });

postSchema.index({ status: 1, publishedAt: -1, isFeatured: -1 });
postSchema.index({ domain: 1, status: 1, publishedAt: -1 });
postSchema.index({ tags: 1, publishedAt: -1 });

export const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
export default Post;
