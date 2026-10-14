import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  tagline: { type: String, trim: true, maxlength: 180, default: '' },
  shortDescription: { type: String, trim: true, maxlength: 300, default: '' },
  icon: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '#ff2a2a' },
  gradient: { type: String, trim: true, default: '' },
  coverImage: { type: String, trim: true, default: '' },
  leadName: { type: String, trim: true, maxlength: 120, default: '' },
  leadRole: { type: String, trim: true, maxlength: 120, default: '' },
  stats: { type: String, trim: true, maxlength: 150, default: '' },
  skills: [{ type: String, trim: true, maxlength: 80 }],
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0, index: true },
  approvalConfig: {
    requiredApprovals: { type: Number, min: 1, max: 10, default: 1 },
    selfApprovalAllowed: { type: Boolean, default: false },
    escalationHours: { type: Number, min: 1, default: 72 },
  },
}, { timestamps: true });

export const Domain = mongoose.models.Domain || mongoose.model('Domain', domainSchema);
export default Domain;
