import mongoose from 'mongoose';

const domainAdminSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true, index: true },
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: false });

domainAdminSchema.index({ userId: 1, domainId: 1 }, { unique: true });

export const DomainAdmin = mongoose.models.DomainAdmin || mongoose.model('DomainAdmin', domainAdminSchema);
export default DomainAdmin;
