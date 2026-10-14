import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  summary: { type: String, trim: true, maxlength: 500, default: '' },
  icon: { type: String, enum: ['Megaphone', 'Calendar', 'Shirt'], default: 'Megaphone' },
  type: { type: String, enum: ['general', 'new_post', 'event', 'achievement', 'custom'], default: 'general' },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  targetAudience: { type: String, enum: ['public', 'members', 'specific_domain'], default: 'members', index: true },
  targetDomain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null },
  channels: [{ type: String, enum: ['in_app', 'email'] }],
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sentAt: { type: Date, default: null },
  isPublished: { type: Boolean, default: false, index: true },
}, { timestamps: true });

announcementSchema.index({ isPublished: 1, targetAudience: 1, createdAt: -1 });

export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
export default Announcement;
