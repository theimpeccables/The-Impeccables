import mongoose from 'mongoose';

const clubSessionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false, index: true },
}, { timestamps: true });

clubSessionSchema.pre('validate', function validateDates() {
  if (this.endDate < this.startDate) this.invalidate('endDate', 'End date must be after start date.');
});

export const ClubSession = mongoose.models.ClubSession || mongoose.model('ClubSession', clubSessionSchema);
export default ClubSession;
