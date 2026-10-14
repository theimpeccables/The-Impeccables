import mongoose from 'mongoose';

const taskAssignmentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
  status: { type: String, enum: ['assigned', 'accepted', 'declined'], default: 'assigned' },
}, { timestamps: true });
taskAssignmentSchema.index({ taskId: 1, userId: 1 }, { unique: true });
taskAssignmentSchema.index({ userId: 1, status: 1 });

export const TaskAssignment = mongoose.models.TaskAssignment || mongoose.model('TaskAssignment', taskAssignmentSchema);
export default TaskAssignment;
