import mongoose from 'mongoose';

const approvalRequestSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'changes_requested'], default: 'pending', index: true },
  currentVersion: { type: Number, default: 1 },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
approvalRequestSchema.index({ domain: 1, status: 1, submittedAt: -1 });

export const ApprovalRequest = mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);
export default ApprovalRequest;
