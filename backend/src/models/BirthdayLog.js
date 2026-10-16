import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ['sent', 'failed', 'skipped', 'queued'], required: true, index: true },
  reason: { type: String, trim: true, maxlength: 300, default: '' },
  error: { type: String, trim: true, maxlength: 1000, default: '' },
  providerMessageId: { type: String, trim: true, maxlength: 300, default: '' },
  triggeredBy: { type: String, enum: ['scheduler', 'manual', 'test'], required: true, index: true },
  sentAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: true } });
schema.index({ userId: 1, date: 1, triggeredBy: 1 }, { unique: true, partialFilterExpression: { triggeredBy: 'scheduler' } });
schema.index({ date: -1, status: 1 });

export const BirthdayLog = mongoose.models.BirthdayLog || mongoose.model('BirthdayLog', schema);
export default BirthdayLog;
