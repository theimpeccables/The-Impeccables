import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  agenda: { type: String, trim: true, maxlength: 12000, default: '' },
  meetingType: { type: String, enum: ['general_body', 'executive_board', 'domain_meeting', 'event_planning', 'other'], default: 'other' },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup', default: null, index: true },
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup' }],
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  endTime: { type: String, trim: true, maxlength: 40, default: '' },
  conclusion: { type: String, trim: true, maxlength: 12000, default: null },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming', index: true },
  completedAt: { type: Date, default: null },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, trim: true, maxlength: 5, default: '' },
  venue: { type: String, trim: true, maxlength: 500, default: '' },
  meetingLink: { type: String, trim: true, maxlength: 2048, default: '' },
  eligibleMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  minDurationMinutes: { type: Number, min: 0, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
export default Meeting;
