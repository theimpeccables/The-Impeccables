import mongoose from 'mongoose';
import { MemberGroup } from '../models/MemberGroup.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { GroupJoinRequest } from '../models/GroupJoinRequest.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { Notification } from '../models/Notification.js';
import { createNotification } from '../services/notificationService.js';
import { recordAudit } from '../services/auditService.js';

const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const isAdmin = (req) => req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role));
const requireManager = async (req, groupId) => {
  if (isAdmin(req)) return;
  const lead = await GroupMembership.exists({ groupId, userId: req.auth.userId, role: 'lead' });
  if (!lead) throw fail(403, 'GROUP_MANAGE_FORBIDDEN', 'You cannot manage this group.');
};
const notifyGroup = async (group, { type, title, message, href, exceptUserId }) => {
  const members = await GroupMembership.find({ groupId: group._id }).select('userId').lean();
  const recipientIds = [...new Set(members.map((row) => String(row.userId)).filter((id) => id !== String(exceptUserId)))];
  await Promise.all(recipientIds.map((recipient) => createNotification({ recipient, type, title, message, href })));
};
const groupShape = (group, count = 0, pending = 0, membership = null, request = null) => ({
  ...group, memberCount: count, pendingRequests: pending,
  myRole: membership?.role || null,
  myRequestStatus: request?.status || null,
  pendingRequestId: request?._id ? String(request._id) : null,
});

export const listGroups = async (req, res) => {
  const ownMemberships = await GroupMembership.find({ userId: req.auth.userId }).select('groupId role').lean();
  const memberGroupIds = ownMemberships.map((item) => item.groupId);
  const ownRequests = await GroupJoinRequest.find({ userId: req.auth.userId, status: 'pending' }).select('_id groupId status').lean();
  const requestByGroup = new Map(ownRequests.map((item) => [String(item.groupId), item]));
  const membershipByGroup = new Map(ownMemberships.map((item) => [String(item.groupId), item]));
  const groups = await MemberGroup.find({ isArchived: false }).sort({ type: 1, name: 1 }).lean();
  const counts = await GroupMembership.aggregate([{ $match: { groupId: { $in: groups.map((group) => group._id) } } }, { $group: { _id: '$groupId', count: { $sum: 1 } } }]);
  const countByGroup = new Map(counts.map((item) => [String(item._id), item.count]));
  const admin = isAdmin(req);
  const isLead = ownMemberships.some((membership) => membership.role === 'lead');
  const manageable = new Set(ownMemberships.filter((membership) => membership.role === 'lead').map((membership) => String(membership.groupId)));
  const pendingCounts = admin || isLead ? await GroupJoinRequest.aggregate([{ $match: { groupId: { $in: groups.filter((group) => admin || manageable.has(String(group._id))).map((group) => group._id) }, status: 'pending' } }, { $group: { _id: '$groupId', count: { $sum: 1 } } }]) : [];
  const pendingByGroup = new Map(pendingCounts.map((item) => [String(item._id), item.count]));
  const visible = groups.filter((group) => admin || manageable.has(String(group._id)) || memberGroupIds.some((id) => String(id) === String(group._id)) || group.acceptsRequests);
  return res.json({ success: true, data: visible.map((group) => groupShape(group, countByGroup.get(String(group._id)) || 0, pendingByGroup.get(String(group._id)) || 0, membershipByGroup.get(String(group._id)), requestByGroup.get(String(group._id)))) });
};

export const createGroup = async (req, res) => {
  if (!isAdmin(req)) throw fail(403, 'GROUP_CREATE_FORBIDDEN', 'Only an administrator can create a group.');
  const slugBase = req.body.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 84);
  const group = await MemberGroup.create({ name: req.body.name, slug: `${slugBase}-${new mongoose.Types.ObjectId().toString().slice(-6)}`, description: req.body.description || '', type: req.body.type || 'custom', acceptsRequests: req.body.acceptsRequests !== false, createdBy: req.auth.userId });
  await recordAudit(req, { action: 'group.create', resourceType: 'MemberGroup', resourceId: group._id });
  return res.status(201).json({ success: true, data: groupShape(group.toObject()) });
};

export const updateGroup = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const fields = ['name', 'description', 'acceptsRequests', 'isArchived'];
  for (const field of fields) if (req.body[field] !== undefined) group[field] = req.body[field];
  await group.save();
  await recordAudit(req, { action: req.body.isArchived ? 'group.archive' : 'group.update', resourceType: 'MemberGroup', resourceId: group._id });
  return res.json({ success: true, data: group.toObject() });
};

export const listGroupMembers = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const rows = await GroupMembership.find({ groupId: group._id }).populate('userId', 'firstName lastName email profilePhoto').populate('addedBy', 'firstName lastName').sort({ joinedAt: 1 }).lean();
  return res.json({ success: true, data: rows });
};

export const addGroupMembers = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const ids = [...new Set(req.body.userIds.map(String))];
  const users = await User.find({ _id: { $in: ids }, isActive: true }).select('_id firstName lastName').lean();
  if (users.length !== ids.length) throw fail(400, 'INVALID_MEMBERS', 'One or more selected members are unavailable.');
  const existing = new Set((await GroupMembership.find({ groupId: group._id, userId: { $in: ids } }).distinct('userId')).map(String));
  await GroupMembership.bulkWrite(
    users.map((user) => ({
      updateOne: {
        filter: { groupId: group._id, userId: user._id },
        update: { $setOnInsert: { groupId: group._id, userId: user._id, role: 'member', addedBy: req.auth.userId } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  await Promise.all(users.filter((user) => !existing.has(String(user._id)) && String(user._id) !== String(req.auth.userId)).map((user) => createNotification({ recipient: user._id, type: 'group_added', title: `Added to ${group.name}`, message: `You are now a member of ${group.name}.`, href: '/dashboard/groups' })));
  return res.json({ success: true, data: await GroupMembership.find({ groupId: group._id }).populate('userId', 'firstName lastName email profilePhoto').sort({ joinedAt: 1 }).lean() });
};

export const updateGroupMember = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const membership = await GroupMembership.findOneAndUpdate({ groupId: group._id, userId: req.params.userId }, { $set: { role: req.body.role } }, { new: true, runValidators: true });
  if (!membership) throw fail(404, 'GROUP_MEMBER_NOT_FOUND', 'Member not found in this group.');
  return res.json({ success: true, data: membership });
};

export const removeGroupMember = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const membership = await GroupMembership.findOneAndDelete({ groupId: group._id, userId: req.params.userId });
  if (!membership) throw fail(404, 'GROUP_MEMBER_NOT_FOUND', 'Member not found in this group.');
  if (String(req.params.userId) !== String(req.auth.userId)) await createNotification({ recipient: req.params.userId, type: 'group_added', title: `Removed from ${group.name}`, message: `You are no longer a member of ${group.name}.`, href: '/dashboard/groups' });
  return res.json({ success: true, data: { removed: true } });
};

export const listGroupRequests = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  await requireManager(req, group._id);
  const rows = await GroupJoinRequest.find({ groupId: group._id }).populate('userId', 'firstName lastName email profilePhoto').populate('decidedBy', 'firstName lastName').sort({ status: 1, createdAt: -1 }).limit(100).lean();
  return res.json({ success: true, data: rows });
};

export const requestToJoin = async (req, res) => {
  const group = await MemberGroup.findOne({ _id: req.params.groupId, isArchived: false });
  if (!group || !group.acceptsRequests) throw fail(404, 'GROUP_UNAVAILABLE', 'This group is not accepting requests.');
  if (await GroupMembership.exists({ groupId: group._id, userId: req.auth.userId })) throw fail(409, 'ALREADY_IN_GROUP', 'You are already in this group.');
  const existingRequest = await GroupJoinRequest.findOne({ groupId: group._id, userId: req.auth.userId, status: 'pending' });
  const request = existingRequest || await GroupJoinRequest.create({ groupId: group._id, userId: req.auth.userId, message: req.body.message || '', status: 'pending' });
  const user = await User.findById(req.auth.userId).select('firstName lastName').lean();
  const leadIds = await GroupMembership.find({ groupId: group._id, role: 'lead' }).distinct('userId');
  const admins = await UserRole.find().populate({ path: 'roleId', match: { name: { $in: ['admin', 'super_admin'] } }, select: 'name' }).select('userId').lean();
  const recipients = [...new Set([...leadIds.map(String), ...admins.filter((row) => row.roleId).map((row) => String(row.userId))])].filter((id) => id !== String(req.auth.userId));
  if (!existingRequest) await Promise.all(recipients.map((recipient) => createNotification({ recipient, type: 'join_request', title: 'New group request', message: `${user.firstName} ${user.lastName} requested to join ${group.name}.`, href: `/dashboard/groups/${group._id}?tab=requests` })));
  return res.status(201).json({ success: true, data: request });
};

export const cancelJoinRequest = async (req, res) => {
  const result = await GroupJoinRequest.deleteOne({ _id: req.params.requestId, userId: req.auth.userId, status: 'pending' });
  if (!result.deletedCount) throw fail(404, 'REQUEST_NOT_FOUND', 'Pending request not found.');
  return res.json({ success: true, data: { cancelled: true } });
};

export const decideJoinRequest = async (req, res) => {
  const request = await GroupJoinRequest.findById(req.params.requestId).populate('userId', 'firstName lastName');
  if (!request || request.status !== 'pending') throw fail(404, 'REQUEST_NOT_FOUND', 'Pending request not found.');
  const group = await MemberGroup.findById(request.groupId);
  await requireManager(req, group._id);
  request.status = req.body.status;
  request.decidedBy = req.auth.userId;
  request.decidedAt = new Date();
  await request.save();
  if (request.status === 'approved') await GroupMembership.updateOne({ groupId: group._id, userId: request.userId._id }, { $setOnInsert: { groupId: group._id, userId: request.userId._id, role: 'member', addedBy: req.auth.userId } }, { upsert: true });
  const approved = request.status === 'approved';
  if (String(request.userId._id) !== String(req.auth.userId)) await createNotification({ recipient: request.userId._id, type: approved ? 'approved' : 'rejected', title: approved ? 'Request approved' : 'Request not approved', message: approved ? `Your request to join ${group.name} was approved.` : `Your request to join ${group.name} was not approved.`, href: '/dashboard/groups' });
  return res.json({ success: true, data: request });
};

export const leaveGroup = async (req, res) => {
  const group = await MemberGroup.findById(req.params.groupId);
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  if (group.type === 'core') throw fail(409, 'CORE_GROUP_CANNOT_LEAVE', 'Core Team membership can only be changed by an administrator.');
  await GroupMembership.deleteOne({ groupId: group._id, userId: req.auth.userId });
  return res.json({ success: true, data: { left: true } });
};
