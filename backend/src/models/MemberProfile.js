import mongoose from 'mongoose';

const memberProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  rollNumber: { type: String, trim: true, uppercase: true, maxlength: 40, default: '' },
  branch: { type: String, trim: true, maxlength: 100, default: '' },
  year: { type: Number, min: 1, max: 8, default: null },
  clubSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ClubSession', default: null, index: true },
  domains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain', index: true }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MemberGroup', index: true }],
  skills: [{ type: String, trim: true, maxlength: 60 }],
  bio: { type: String, trim: true, maxlength: 1000, default: '' },
  roleTitle: { type: String, trim: true, maxlength: 100, default: '' },
  portfolioLinks: {
    instagram: { type: String, trim: true, maxlength: 300, default: '' },
    linkedin: { type: String, trim: true, maxlength: 300, default: '' },
    behance: { type: String, trim: true, maxlength: 300, default: '' },
    github: { type: String, trim: true, maxlength: 300, default: '' },
  },
  joinedAt: { type: Date, default: Date.now },
  isActiveInClub: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  notificationPreferences: {
    emailBirthday: { type: Boolean, default: true },
    emailTasks: { type: Boolean, default: true },
    emailApprovals: { type: Boolean, default: true },
    emailAnnouncements: { type: Boolean, default: true },
    inAppAll: { type: Boolean, default: true },
  },
}, { timestamps: true });

export const MemberProfile = mongoose.models.MemberProfile || mongoose.model('MemberProfile', memberProfileSchema);
export default MemberProfile;
