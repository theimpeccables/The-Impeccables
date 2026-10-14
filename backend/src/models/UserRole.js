import mongoose from 'mongoose';

const userRoleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: false });

userRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export const UserRole = mongoose.models.UserRole || mongoose.model('UserRole', userRoleSchema);
export default UserRole;
