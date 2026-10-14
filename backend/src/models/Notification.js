import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['task', 'approval', 'event', 'attendance', 'announcement', 'system', 'meeting', 'join_request', 'approved', 'rejected', 'group_added'], default: 'system' },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  href: { type: String, trim: true, maxlength: 500, default: '' },
  relatedModel: { type: String, trim: true, maxlength: 60, default: '' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  dedupeKey: { type: String, trim: true, maxlength: 220, default: undefined },
  readAt: { type: Date, default: null, index: true },
}, { timestamps: true });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
