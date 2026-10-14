import mongoose from 'mongoose';
// Role documents populate Permission references in both authentication and role APIs.
// Register the referenced model whenever Role is imported so those queries work
// even when no other module has imported Permission directly.
import './Permission.js';

const roleSchema = new mongoose.Schema({
  name: { type: String, enum: ['member', 'domain_admin', 'admin', 'super_admin'], required: true, unique: true },
  displayName: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  level: { type: Number, required: true, min: 1, max: 4 },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  isSystem: { type: Boolean, default: true },
}, { timestamps: true });

export const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
export default Role;
