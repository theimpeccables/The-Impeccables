import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  note: { type: String, trim: true, maxlength: 5000, default: '' },
  link: { type: String, trim: true, maxlength: 2048, default: '' },
  status: { type: String, enum: ['submitted', 'changes_requested', 'approved', 'withdrawn'], default: 'submitted', index: true },
  withdrawnFromStatus: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewComment: { type: String, trim: true, maxlength: 3000, default: '' },
  isLate: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  history: [{ version: Number, note: String, link: String, status: String, submittedAt: Date, isLate: Boolean, files: [{ filePath: String, fileName: String, fileType: String, fileSize: Number }], reviewedAt: Date, reviewComment: String }],
}, { timestamps: true });
schema.index({ taskId: 1, userId: 1 }, { unique: true });

export const TaskSubmission = mongoose.models.TaskSubmission || mongoose.model('TaskSubmission', schema);
export default TaskSubmission;
