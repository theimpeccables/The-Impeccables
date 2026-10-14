import mongoose from 'mongoose';
import { matchedData } from 'express-validator';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { validateDomainIds } from './memberController.js';
import { recordAudit } from '../services/auditService.js';

export const listRoles = async (_req, res) => {
  const roles = await Role.find().sort({ level: 1 }).populate('permissions', 'name module description');
  return res.json({ success: true, data: roles });
};

export const assignRole = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  }
  const { role: roleName, domainIds = [] } = matchedData(req, { locations: ['body'] });
  const [user, role] = await Promise.all([
    User.findById(req.params.userId).select('_id isActive'),
    Role.findOne({ name: roleName }).select('_id name'),
  ]);
  if (!user) return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  if (!user.isActive) return res.status(409).json({ success: false, error: { code: 'MEMBER_INACTIVE', message: 'Reactivate this member before assigning roles.' } });
  if (!role) return res.status(400).json({ success: false, error: { code: 'ROLE_NOT_FOUND', message: 'The requested role is not configured.' } });
  if (roleName === 'domain_admin' && !await validateDomainIds(domainIds)) {
    return res.status(400).json({ success: false, error: { code: 'DOMAIN_ASSIGNMENT_REQUIRED', message: 'Assign a domain administrator to one or more active domains.' } });
  }

  await UserRole.updateOne(
    { userId: user._id, roleId: role._id },
    { $setOnInsert: { assignedBy: req.auth.userId, assignedAt: new Date() } },
    { upsert: true },
  );
  if (roleName === 'domain_admin') {
    const wanted = domainIds.map((id) => new mongoose.Types.ObjectId(id));
    await Promise.all([
      DomainAdmin.updateMany({ userId: user._id, domainId: { $nin: wanted } }, { $set: { isActive: false } }),
      ...wanted.map((domainId) => DomainAdmin.updateOne(
        { userId: user._id, domainId },
        { $set: { isActive: true, assignedBy: req.auth.userId }, $setOnInsert: { assignedAt: new Date() } },
        { upsert: true },
      )),
    ]);
  }
  await recordAudit(req, { action: 'role.assign', resourceType: 'User', resourceId: user._id, metadata: { role: role.name, domainIds: roleName === 'domain_admin' ? domainIds : [] } });
  return res.status(200).json({ success: true, data: { userId: String(user._id), role: role.name, domainIds: roleName === 'domain_admin' ? domainIds : [] } });
};

export const revokeRole = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  }
  const { role: roleName } = matchedData(req, { locations: ['body'] });
  const role = await Role.findOne({ name: roleName }).select('_id name');
  if (!role) return res.status(404).json({ success: false, error: { code: 'ROLE_NOT_FOUND', message: 'The requested role is not configured.' } });
  if (roleName === 'super_admin') {
    const [activeSuperAdmins] = await UserRole.aggregate([
      { $match: { roleId: role._id } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $match: { 'user.isActive': true } },
      { $count: 'total' },
    ]);
    if ((activeSuperAdmins?.total || 0) <= 1) {
      return res.status(409).json({ success: false, error: { code: 'LAST_SUPER_ADMIN', message: 'The last active Super Admin role cannot be revoked.' } });
    }
  }
  const assignment = await UserRole.findOneAndDelete({ userId: req.params.userId, roleId: role._id });
  if (!assignment) return res.status(404).json({ success: false, error: { code: 'ROLE_ASSIGNMENT_NOT_FOUND', message: 'This role is not assigned to the member.' } });
  if (roleName === 'domain_admin') await DomainAdmin.deleteMany({ userId: req.params.userId });
  await recordAudit(req, { action: 'role.revoke', resourceType: 'User', resourceId: req.params.userId, metadata: { role: role.name } });
  return res.json({ success: true, data: { userId: req.params.userId, revokedRole: role.name } });
};
