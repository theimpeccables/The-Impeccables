import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String },
  owner: { type: String, required: true },
  state: { type: String, enum: ['running', 'completed'], default: 'running' },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BirthdayRunLock = mongoose.models.BirthdayRunLock || mongoose.model('BirthdayRunLock', schema);
export default BirthdayRunLock;
