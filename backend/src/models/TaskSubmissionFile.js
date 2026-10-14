import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskSubmission', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filePath: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true, maxlength: 255 },
  fileType: { type: String, required: true, trim: true, maxlength: 160 },
  fileSize: { type: Number, required: true, min: 1 },
  version: { type: Number, required: true, default: 1 },
}, { timestamps: true });
schema.index({ submissionId: 1, version: 1 });

export const TaskSubmissionFile = mongoose.models.TaskSubmissionFile || mongoose.model('TaskSubmissionFile', schema);
export default TaskSubmissionFile;
