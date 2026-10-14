import mongoose from 'mongoose';

const memberGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  type: { type: String, enum: ['domain', 'core', 'custom'], default: 'custom', index: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null },
  acceptsRequests: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isArchived: { type: Boolean, default: false, index: true },
  color: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: '#ff2a2a' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const MemberGroup = mongoose.models.MemberGroup || mongoose.model('MemberGroup', memberGroupSchema);
export default MemberGroup;
