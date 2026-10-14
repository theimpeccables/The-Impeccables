import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, lowercase: true },
  module: { type: String, required: true, trim: true, lowercase: true, index: true },
  description: { type: String, trim: true, default: '' },
}, { timestamps: true });

export const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
export default Permission;
