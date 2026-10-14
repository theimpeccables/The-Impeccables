import mongoose from 'mongoose';

const meetingResponseSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['attending', 'not_attending'], required: true },
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  respondedAt: { type: Date, default: Date.now },
}, { timestamps: true });
meetingResponseSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

export const MeetingResponse = mongoose.models.MeetingResponse || mongoose.model('MeetingResponse', meetingResponseSchema);
export default MeetingResponse;
