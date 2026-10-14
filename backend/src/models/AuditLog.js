import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, trim: true, maxlength: 120, index: true },
  resourceType: { type: String, required: true, trim: true, maxlength: 80, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  requestId: { type: String, trim: true, maxlength: 100, default: '' },
  ip: { type: String, trim: true, maxlength: 80, default: '' },
  userAgent: { type: String, trim: true, maxlength: 300, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
