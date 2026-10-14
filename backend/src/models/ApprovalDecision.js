import mongoose from 'mongoose';

const approvalDecisionSchema = new mongoose.Schema({
  approvalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest', required: true, index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  decision: { type: String, enum: ['approved', 'rejected', 'changes_requested'], required: true },
  comments: { type: String, trim: true, maxlength: 3000, default: '' },
  version: { type: Number, required: true },
  decidedAt: { type: Date, default: Date.now },
});
approvalDecisionSchema.index({ approvalRequestId: 1, reviewerId: 1, version: 1 }, { unique: true });

export const ApprovalDecision = mongoose.models.ApprovalDecision || mongoose.model('ApprovalDecision', approvalDecisionSchema);
export default ApprovalDecision;
