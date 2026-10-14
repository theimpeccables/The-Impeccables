import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['member', 'lead'], default: 'member' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ groupId: 1, userId: 1 }, { unique: true });

export const GroupMembership = mongoose.models.GroupMembership || mongoose.model('GroupMembership', schema);
export default GroupMembership;
