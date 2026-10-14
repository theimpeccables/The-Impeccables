import mongoose from 'mongoose';

const volunteerSlotSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  domain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null, index: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  capacity: { type: Number, min: 1, max: 1000, required: true },
  reservedCount: { type: Number, min: 0, default: 0 },
  isOpen: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
volunteerSlotSchema.index({ eventId: 1, startsAt: 1 });

export const VolunteerSlot = mongoose.models.VolunteerSlot || mongoose.model('VolunteerSlot', volunteerSlotSchema);
export default VolunteerSlot;
