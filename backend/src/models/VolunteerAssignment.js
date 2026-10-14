import mongoose from 'mongoose';

const volunteerAssignmentSchema = new mongoose.Schema({
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerSlot', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['signed_up', 'assigned', 'confirmed', 'completed', 'cancelled'], default: 'signed_up' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });
volunteerAssignmentSchema.index({ slotId: 1, userId: 1 }, { unique: true });
volunteerAssignmentSchema.index({ eventId: 1, userId: 1 });

export const VolunteerAssignment = mongoose.models.VolunteerAssignment || mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);
export default VolunteerAssignment;
