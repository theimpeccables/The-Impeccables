import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 220 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  eventType: { type: String, enum: ['festival', 'workshop', 'competition', 'exhibition', 'meetup', 'celebration', 'other'], default: 'other' },
  date: { type: Date, default: null, index: true },
  endDate: { type: Date, default: null },
  setupTime: { type: Date, default: null },
  venue: { type: String, trim: true, maxlength: 240, default: '' },
  posterImage: { type: String, trim: true, maxlength: 2048, default: '' },
  gallery: [{ type: String, trim: true, maxlength: 2048 }],
  registrationLink: { type: String, trim: true, maxlength: 2048, default: '' },
  registrationDeadline: { type: Date, default: null },
  isPublished: { type: Boolean, default: false, index: true },
  isRecurring: { type: Boolean, default: false },
  domains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  aftermovieUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  highlights: [{ type: String, trim: true, maxlength: 300 }],
  achievements: [{ type: String, trim: true, maxlength: 300 }],
}, { timestamps: true });

eventSchema.index({ isPublished: 1, date: 1 });
eventSchema.index({ domains: 1, date: 1 });

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;
