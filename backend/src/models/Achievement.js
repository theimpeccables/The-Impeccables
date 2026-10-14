import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  category: { type: String, trim: true, maxlength: 100, default: '' },
  awardedAt: { type: Date, default: null, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  imageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  isPublished: { type: Boolean, default: false, index: true },
}, { timestamps: true });

achievementSchema.index({ isPublished: 1, awardedAt: -1 });

export const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
export default Achievement;
