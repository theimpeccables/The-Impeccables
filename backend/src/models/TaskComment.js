import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const TaskComment = mongoose.models.TaskComment || mongoose.model('TaskComment', schema);
export default TaskComment;
