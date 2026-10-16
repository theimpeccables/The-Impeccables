import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    index: true,
  },
  passwordHash: { type: String, required: true, select: false },
  firstName: { type: String, required: true, trim: true, maxlength: 60 },
  lastName: { type: String, required: true, trim: true, maxlength: 60 },
  firstNameSearch: { type: String, select: false, default: '' },
  lastNameSearch: { type: String, select: false, default: '' },
  profilePhoto: { type: String, default: '' },
  profilePhotoPublicId: { type: String, select: false, default: '' },
  phone: { type: String, trim: true, maxlength: 32, default: '' },
  dateOfBirth: { type: Date, default: null },
  birthdayEmailOptOut: { type: Boolean, default: false },
  showBirthdayToClub: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date, default: null },
  passwordResetTokenHash: { type: String, select: false, default: undefined },
  passwordResetExpiresAt: { type: Date, select: false, default: undefined },
  passwordChangedAt: { type: Date, default: null },
}, { timestamps: true, toJSON: { virtuals: true } });

const normalizedName = (value) => String(value || '').trim().toLowerCase();

userSchema.pre('validate', function setNormalizedNames() {
  this.firstNameSearch = normalizedName(this.firstName);
  this.lastNameSearch = normalizedName(this.lastName);
});

userSchema.pre('findOneAndUpdate', function syncNormalizedNames() {
  const update = this.getUpdate() || {};
  for (const field of ['firstName', 'lastName']) {
    const normalizedField = `${field}Search`;
    const updateBucket = ['$set', '$setOnInsert'].find((bucket) => update[bucket]?.[field] !== undefined);
    if (updateBucket) update[updateBucket][normalizedField] = normalizedName(update[updateBucket][field]);
    else if (update[field] !== undefined) update[normalizedField] = normalizedName(update[field]);
  }
  this.setUpdate(update);
});

userSchema.index({ isActive: 1, firstNameSearch: 1 });
userSchema.index({ isActive: 1, lastNameSearch: 1 });
userSchema.index({ isActive: 1, lastName: 1, firstName: 1, _id: 1 });

userSchema.virtual('name').get(function getName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
