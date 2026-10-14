import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  status: { type: String, enum: ['open', 'assigned', 'accepted', 'in_progress', 'blocked', 'completed', 'closed', 'cancelled'], default: 'open', index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup', default: null, index: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  dueAt: { type: Date, default: null, index: true },
  requiresSubmission: { type: Boolean, default: true },
  submissionTypeHint: { type: String, trim: true, maxlength: 160, default: '' },
  assignWholeGroup: { type: Boolean, default: true },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null, index: true },
  associatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date, default: null, index: true },
  completedAt: { type: Date, default: null },
  allocationMethod: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
  allocationReason: { type: String, trim: true, maxlength: 300, default: '' },
}, { timestamps: true });

taskSchema.index({ status: 1, dueAt: 1 });

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export default Task;
