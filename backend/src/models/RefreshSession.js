import mongoose from 'mongoose';

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null, index: true },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshSession', default: null },
  userAgent: { type: String, trim: true, maxlength: 500, default: '' },
  ipAddress: { type: String, trim: true, maxlength: 64, default: '' },
}, { timestamps: true });

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ familyId: 1, revokedAt: 1 });

export const RefreshSession = mongoose.models.RefreshSession || mongoose.model('RefreshSession', refreshSessionSchema);
export default RefreshSession;
