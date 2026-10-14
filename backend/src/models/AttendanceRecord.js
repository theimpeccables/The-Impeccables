import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['present', 'absent', 'excused', 'late', 'left_early', null], default: null, index: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  markedAt: { type: Date, default: null },
  checkInTime: { type: Date, default: null },
  checkOutTime: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true });
attendanceRecordSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);
export default AttendanceRecord;
