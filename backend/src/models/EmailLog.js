import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  idempotencyKey: { type: String, required: true, unique: true, maxlength: 180 },
  recipient: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  template: { type: String, required: true, maxlength: 80 },
  subject: { type: String, required: true, maxlength: 200 },
  status: { type: String, enum: ['processing', 'sent', 'failed'], default: 'processing', index: true },
  attempts: { type: Number, default: 0 },
  providerMessageId: { type: String, default: '' },
  lastErrorCode: { type: String, default: '' },
  sentAt: { type: Date, default: null },
  attemptedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
