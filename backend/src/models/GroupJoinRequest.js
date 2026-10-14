import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ groupId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export const GroupJoinRequest = mongoose.models.GroupJoinRequest || mongoose.model('GroupJoinRequest', schema);
export default GroupJoinRequest;
