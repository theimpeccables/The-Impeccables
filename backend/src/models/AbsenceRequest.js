import mongoose from 'mongoose';

const absenceRequestSchema = new mongoose.Schema({
  attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  explanation: { type: String, required: true, trim: true, maxlength: 3000 },
  supportingDocument: { type: String, trim: true, maxlength: 2048, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  submittedAt: { type: Date, default: Date.now },
  deadline: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 1500, default: '' },
  originalStatus: { type: String, default: 'absent' },
}, { timestamps: true });
absenceRequestSchema.index({ attendanceRecordId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export const AbsenceRequest = mongoose.models.AbsenceRequest || mongoose.model('AbsenceRequest', absenceRequestSchema);
export default AbsenceRequest;
