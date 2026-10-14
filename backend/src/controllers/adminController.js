import { AbsenceRequest } from '../models/AbsenceRequest.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AuditLog } from '../models/AuditLog.js';
import { Event } from '../models/Event.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Post } from '../models/Post.js';
import { Report } from '../models/Report.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { UserRole } from '../models/UserRole.js';
import { Domain } from '../models/Domain.js';
import { recordAudit } from '../services/auditService.js';

export const getAdminOverview = async (_req, res) => {
  const now = new Date();
  const [members, publicProfiles, publishedPosts, pendingApprovals, tasks, attendance, upcomingEvents, postsByStatus, tasksByStatus] = await Promise.all([
    User.countDocuments({ isActive: true }), MemberProfile.countDocuments({ isPublic: true, isActiveInClub: true }),
    Post.countDocuments({ status: 'published' }), Post.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    Task.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
    AttendanceRecord.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Event.find({ isPublished: true, date: { $gte: now } }).sort({ date: 1 }).limit(5).select('title slug date venue').lean(),
    Post.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  return res.json({ success: true, data: { members, publicProfiles, publishedPosts, pendingApprovals, openTasks: tasks, upcomingEvents, attendance: Object.fromEntries(attendance.map((item) => [item._id, item.count])), postsByStatus: Object.fromEntries(postsByStatus.map((item) => [item._id, item.count])), tasksByStatus: Object.fromEntries(tasksByStatus.map((item) => [item._id, item.count])) } });
};

export const listAuditLogs = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 50); const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  const [items, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'firstName lastName email').lean(), AuditLog.countDocuments(filter)]);
  return res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

export const listReports = async (_req, res) => res.json({ success: true, data: await Report.find().sort({ createdAt: -1 }).limit(100).populate('generatedBy', 'firstName lastName').lean() });

export const generateWeeklyReport = async (req, res) => {
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 7);
  const [members, activePosts, approvals, completedTasks, attendance, events] = await Promise.all([
    User.countDocuments({ isActive: true }), Post.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Post.countDocuments({ status: 'under_review' }), Task.countDocuments({ status: 'completed', completedAt: { $gte: start, $lte: end } }),
    AttendanceRecord.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Event.countDocuments({ isPublished: true, date: { $gte: start, $lte: end } }),
  ]);
  const data = { members, activePosts, approvals, completedTasks, attendance: Object.fromEntries(attendance.map((item) => [item._id, item.count])), events };
  const report = await Report.create({ type: 'weekly', periodStart: start, periodEnd: end, generatedBy: req.auth.userId, data });
  await recordAudit(req, { action: 'report.generate', resourceType: 'Report', resourceId: report._id, metadata: { reportType: 'weekly' } });
  return res.status(201).json({ success: true, data: report });
};

export const getSystemSettings = async (_req, res) => {
  const settings = await SystemSetting.find().sort({ key: 1 }).select('key value description updatedAt').lean();
  return res.json({ success: true, data: settings });
};

export const listAdminDomains = async (_req, res) => res.json({ success: true, data: await Domain.find().sort({ sortOrder: 1 }).lean() });

export const updateSystemSetting = async (req, res) => {
  const setting = await SystemSetting.findOneAndUpdate({ key: req.params.key }, { $set: { value: req.body.value, updatedBy: req.auth.userId }, $setOnInsert: { key: req.params.key, description: req.body.description || '' } }, { upsert: true, new: true, runValidators: true });
  await recordAudit(req, { action: 'settings.update', resourceType: 'SystemSetting', resourceId: setting._id, metadata: { key: setting.key } });
  return res.json({ success: true, data: setting });
};

export const listAdminMembers = async (_req, res) => {
  const users = await User.find().select('firstName lastName email isActive createdAt').sort({ lastName: 1 }).limit(200).lean();
  const roles = await UserRole.find({ userId: { $in: users.map((user) => user._id) } }).populate('roleId', 'name displayName').lean();
  const byUser = new Map(); for (const assignment of roles) byUser.set(String(assignment.userId), [...(byUser.get(String(assignment.userId)) || []), assignment.roleId?.name].filter(Boolean));
  const roleIds = [...new Set(roles.map((assignment) => assignment.roleId?._id).filter(Boolean))];
  return res.json({ success: true, data: users.map((user) => ({ ...user, roles: byUser.get(String(user._id)) || [] })), roles: await Role.find({ _id: { $in: roleIds } }).select('name displayName level').lean() });
};

export const listAbsenceRequestsForAdmin = async (_req, res) => res.json({ success: true, data: await AbsenceRequest.find({ status: 'pending' }).sort({ submittedAt: 1 }).populate('userId', 'firstName lastName').lean() });
