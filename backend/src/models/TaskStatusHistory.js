import mongoose from 'mongoose';

const taskStatusHistorySchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  fromStatus: { type: String, default: '' },
  toStatus: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
});

export const TaskStatusHistory = mongoose.models.TaskStatusHistory || mongoose.model('TaskStatusHistory', taskStatusHistorySchema);
export default TaskStatusHistory;
