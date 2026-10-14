import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
