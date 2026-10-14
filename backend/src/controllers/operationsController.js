import mongoose from 'mongoose';
import { Domain } from '../models/Domain.js';
import { Event } from '../models/Event.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Task } from '../models/Task.js';
import { TaskAssignment } from '../models/TaskAssignment.js';
import { TaskStatusHistory } from '../models/TaskStatusHistory.js';
import { User } from '../models/User.js';
import { VolunteerAssignment } from '../models/VolunteerAssignment.js';
import { VolunteerSlot } from '../models/VolunteerSlot.js';
import { canAccessDomain, isSuperAdmin } from '../utils/authorization.js';
import { recordAudit } from '../services/auditService.js';

const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const resolveDomain = async (value) => {
  if (!value) return null;
  return Domain.findOne({ $or: [{ _id: mongoose.isValidObjectId(value) ? value : null }, { slug: String(value).toLowerCase() }] }).select('_id');
};
const ensureScope = (req, domainId) => {
  if (!domainId && req.auth.roles.includes('domain_admin') && !req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role))) throw fail(403, 'DOMAIN_SCOPE_FORBIDDEN', 'Domain administrators must choose one of their assigned domains.');
  if (domainId && !canAccessDomain(req.auth, domainId)) throw fail(403, 'DOMAIN_SCOPE_FORBIDDEN', 'You cannot manage work in this domain.');
};

export const listTasks = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const privileged = req.auth.permissions.includes('task:list');
  const assignmentFilter = privileged ? {} : { userId: req.auth.userId, status: { $in: ['assigned', 'accepted'] } };
  const assignments = await TaskAssignment.find(assignmentFilter).select('taskId userId status').lean();
  const taskFilter = privileged ? {} : { _id: { $in: assignments.map((a) => a.taskId) } };
  if (req.query.status && req.query.status !== 'all') taskFilter.status = req.query.status;
  if (req.auth.roles.includes('domain_admin') && !req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role))) taskFilter.domain = { $in: req.auth.domainIds };
  const [items, total] = await Promise.all([Task.find(taskFilter).sort({ deadline: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('domain', 'name slug').populate('associatedEvent', 'title slug').populate('createdBy', 'firstName lastName').lean(), Task.countDocuments(taskFilter)]);
  const assignmentsByTask = new Map();
  for (const assignment of assignments) assignmentsByTask.set(String(assignment.taskId), [...(assignmentsByTask.get(String(assignment.taskId)) || []), assignment]);
  res.json({ success: true, data: { items: items.map((task) => ({ ...task, assignments: assignmentsByTask.get(String(task._id)) || [] })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

export const createTask = async (req, res) => {
  const domain = await resolveDomain(req.body.domainId);
  if (req.body.domainId && !domain) throw fail(400, 'INVALID_DOMAIN', 'The selected domain does not exist.');
  ensureScope(req, domain?._id);
  if (req.body.associatedEvent && !(await Event.exists({ _id: req.body.associatedEvent }))) throw fail(400, 'INVALID_EVENT', 'The selected event does not exist.');
  const task = await Task.create({ title: req.body.title, description: req.body.description || '', priority: req.body.priority || 'medium', deadline: req.body.deadline || null, domain: domain?._id || null, associatedEvent: req.body.associatedEvent || null, createdBy: req.auth.userId });
  await TaskStatusHistory.create({ taskId: task._id, toStatus: 'open', changedBy: req.auth.userId, note: 'Task created.' });
  await recordAudit(req, { action: 'task.create', resourceType: 'Task', resourceId: task._id, metadata: { priority: task.priority, domain: task.domain ? String(task.domain) : null } });
  return res.status(201).json({ success: true, data: task });
};

const activeWorkload = async (userId) => TaskAssignment.countDocuments({ userId, status: { $in: ['assigned', 'accepted'] } }).where('taskId').in(await Task.find({ status: { $in: ['assigned', 'accepted', 'in_progress', 'blocked'] } }).distinct('_id'));

const allocateUsers = async (task, requestedUserIds, actorId, automatic = false) => {
  let userIds = requestedUserIds || [];
  if (automatic) {
    const profileFilter = { isActiveInClub: true };
    if (task.domain) profileFilter.domains = task.domain;
    const profiles = await MemberProfile.find(profileFilter).select('userId').lean();
    const candidates = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('_id').lean();
    if (!candidates.length) throw fail(409, 'NO_ELIGIBLE_MEMBERS', 'No active members are available in this domain.');
    const workloads = await Promise.all(candidates.map(async (candidate) => ({ userId: candidate._id, workload: await activeWorkload(candidate._id) })));
    userIds = workloads.sort((a, b) => a.workload - b.workload).slice(0, 1).map((candidate) => candidate.userId);
  }
  if (!userIds.length) throw fail(400, 'ASSIGNEE_REQUIRED', 'Choose at least one member to assign this task to.');
  const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id').lean();
  if (users.length !== new Set(userIds.map(String)).size) throw fail(400, 'INVALID_ASSIGNEE', 'One or more selected members are inactive or do not exist.');
  const assignments = [];
  for (const user of users) assignments.push(await TaskAssignment.findOneAndUpdate({ taskId: task._id, userId: user._id }, { $setOnInsert: { taskId: task._id, userId: user._id, assignedBy: actorId, status: 'assigned' } }, { upsert: true, new: true, setDefaultsOnInsert: true }));
  task.status = 'assigned';
  task.allocationMethod = automatic ? 'automatic' : 'manual';
  task.allocationReason = automatic ? `Assigned to the active eligible member with the lowest open workload (${await activeWorkload(userIds[0])} tasks).` : '';
  await task.save();
  await TaskStatusHistory.create({ taskId: task._id, fromStatus: 'open', toStatus: 'assigned', changedBy: actorId, note: automatic ? 'Workload-aware automatic allocation.' : 'Manually assigned.' });
  return assignments;
};

export const assignTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!['open', 'assigned'].includes(task.status)) throw fail(409, 'TASK_NOT_ASSIGNABLE', 'Only open or already assigned tasks can be assigned.');
  ensureScope(req, task.domain);
  const assignments = await allocateUsers(task, req.body.userIds, req.auth.userId);
  await recordAudit(req, { action: 'task.assign', resourceType: 'Task', resourceId: task._id, metadata: { assignees: req.body.userIds.length } });
  return res.json({ success: true, data: { task, assignments } });
};

export const autoAssignTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!['open', 'assigned'].includes(task.status)) throw fail(409, 'TASK_NOT_ASSIGNABLE', 'Only open or already assigned tasks can be allocated.');
  ensureScope(req, task.domain);
  const assignments = await allocateUsers(task, [], req.auth.userId, true);
  await recordAudit(req, { action: 'task.auto_assign', resourceType: 'Task', resourceId: task._id, metadata: { assignees: assignments.length } });
  return res.json({ success: true, data: { task, assignments } });
};

const taskTransitions = { open: ['assigned', 'cancelled'], assigned: ['accepted', 'open', 'cancelled'], accepted: ['in_progress', 'blocked', 'declined', 'cancelled'], in_progress: ['blocked', 'completed'], blocked: ['in_progress', 'completed', 'cancelled'], completed: [], cancelled: [] };
export const updateTaskStatus = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  const assignment = await TaskAssignment.findOne({ taskId: task._id, userId: req.auth.userId, status: { $in: ['assigned', 'accepted'] } });
  const canManage = isSuperAdmin(req.auth) || req.auth.permissions.includes('task:edit');
  if (!canManage && !assignment) throw fail(403, 'TASK_FORBIDDEN', 'You can only update tasks assigned to you.');
  ensureScope(req, task.domain);
  const next = req.body.status;
  if (!taskTransitions[task.status]?.includes(next)) throw fail(409, 'INVALID_TASK_TRANSITION', `A task cannot move from ${task.status} to ${next}.`);
  const previous = task.status;
  if (next === 'declined') {
    await TaskAssignment.updateOne({ _id: assignment._id }, { $set: { status: 'declined' } });
    const remaining = await TaskAssignment.countDocuments({ taskId: task._id, status: { $in: ['assigned', 'accepted'] } });
    task.status = remaining ? 'assigned' : 'open';
  } else {
    task.status = next;
    if (assignment && ['accepted', 'in_progress', 'blocked', 'completed'].includes(next)) {
      await TaskAssignment.updateOne({ _id: assignment._id }, { $set: { status: next === 'accepted' ? 'accepted' : 'accepted', ...(next === 'accepted' ? { acceptedAt: new Date() } : {}) } });
    }
  }
  if (task.status === 'completed') task.completedAt = new Date();
  await task.save();
  await TaskStatusHistory.create({ taskId: task._id, fromStatus: previous, toStatus: task.status, changedBy: req.auth.userId, note: req.body.note || '' });
  await recordAudit(req, { action: 'task.status', resourceType: 'Task', resourceId: task._id, metadata: { fromStatus: previous, toStatus: task.status } });
  return res.json({ success: true, data: task });
};

export const createVolunteerSlot = async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) throw fail(404, 'EVENT_NOT_FOUND', 'Event not found.');
  const domain = await resolveDomain(req.body.domainId);
  if (req.body.domainId && !domain) throw fail(400, 'INVALID_DOMAIN', 'The selected domain does not exist.');
  ensureScope(req, domain?._id);
  const startsAt = new Date(req.body.startsAt); const endsAt = new Date(req.body.endsAt);
  if (endsAt <= startsAt) throw fail(400, 'INVALID_SHIFT', 'Shift end must be after the start time.');
  const slot = await VolunteerSlot.create({ eventId: event._id, title: req.body.title, description: req.body.description || '', domain: domain?._id || null, startsAt, endsAt, capacity: req.body.capacity, createdBy: req.auth.userId });
  return res.status(201).json({ success: true, data: slot });
};

export const listVolunteerSlots = async (req, res) => {
  if (!(await Event.exists({ _id: req.params.eventId, isPublished: true }))) throw fail(404, 'EVENT_NOT_FOUND', 'Published event not found.');
  const slots = await VolunteerSlot.find({ eventId: req.params.eventId, isOpen: true }).sort({ startsAt: 1 }).populate('domain', 'name').lean();
  return res.json({ success: true, data: slots });
};

export const signupVolunteer = async (req, res) => {
  const slot = await VolunteerSlot.findOne({ _id: req.params.slotId, isOpen: true });
  if (!slot) throw fail(404, 'VOLUNTEER_SLOT_NOT_FOUND', 'This volunteer shift is not open.');
  ensureScope(req, slot.domain);
  const previous = await VolunteerAssignment.findOne({ slotId: slot._id, userId: req.auth.userId });
  if (previous && previous.status !== 'cancelled') throw fail(409, 'ALREADY_SIGNED_UP', 'You have already signed up for this shift.');
  const existingSlotIds = await VolunteerAssignment.find({ userId: req.auth.userId, status: { $nin: ['cancelled'] } }).distinct('slotId');
  const conflict = await VolunteerSlot.exists({ _id: { $in: existingSlotIds }, startsAt: { $lt: slot.endsAt }, endsAt: { $gt: slot.startsAt } });
  if (conflict) throw fail(409, 'SHIFT_CONFLICT', 'You already have a volunteer shift that overlaps this time.');
  const reserved = await VolunteerSlot.findOneAndUpdate({ _id: slot._id, isOpen: true, $expr: { $lt: ['$reservedCount', '$capacity'] } }, { $inc: { reservedCount: 1 } }, { new: true });
  if (!reserved) throw fail(409, 'VOLUNTEER_SLOT_FULL', 'This shift has reached capacity.');
  try {
    let assignment;
    if (previous) {
      const changed = await VolunteerAssignment.updateOne({ _id: previous._id, status: 'cancelled' }, { $set: { eventId: slot.eventId, status: 'signed_up', assignedBy: null } });
      if (!changed.modifiedCount) throw fail(409, 'ALREADY_SIGNED_UP', 'Your signup is already active.');
      assignment = await VolunteerAssignment.findById(previous._id);
    } else assignment = await VolunteerAssignment.create({ slotId: slot._id, eventId: slot.eventId, userId: req.auth.userId, status: 'signed_up' });
    await recordAudit(req, { action: 'volunteer.signup', resourceType: 'VolunteerAssignment', resourceId: assignment._id, metadata: { eventId: String(slot.eventId) } });
    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    await VolunteerSlot.updateOne({ _id: slot._id }, { $inc: { reservedCount: -1 } });
    if (error.code === 11000) throw fail(409, 'ALREADY_SIGNED_UP', 'You have already signed up for this shift.');
    if (error.statusCode === 409) throw error;
    throw error;
  }
};

export const assignVolunteer = async (req, res) => {
  const slot = await VolunteerSlot.findOne({ _id: req.params.slotId, isOpen: true });
  if (!slot) throw fail(404, 'VOLUNTEER_SLOT_NOT_FOUND', 'This volunteer shift is not open.');
  ensureScope(req, slot.domain);
  if (!(await User.exists({ _id: req.body.userId, isActive: true }))) throw fail(404, 'MEMBER_NOT_FOUND', 'Active member not found.');
  const previous = await VolunteerAssignment.findOne({ slotId: slot._id, userId: req.body.userId });
  if (previous && previous.status !== 'cancelled') throw fail(409, 'ALREADY_ASSIGNED', 'This member already has an active assignment for this shift.');
  const slotIds = await VolunteerAssignment.find({ userId: req.body.userId, status: { $nin: ['cancelled'] } }).distinct('slotId');
  const conflict = await VolunteerSlot.exists({ _id: { $in: slotIds }, startsAt: { $lt: slot.endsAt }, endsAt: { $gt: slot.startsAt } });
  if (conflict) throw fail(409, 'SHIFT_CONFLICT', 'This member already has a volunteer shift at that time.');
  const reserved = await VolunteerSlot.findOneAndUpdate({ _id: slot._id, isOpen: true, $expr: { $lt: ['$reservedCount', '$capacity'] } }, { $inc: { reservedCount: 1 } }, { new: true });
  if (!reserved) throw fail(409, 'VOLUNTEER_SLOT_FULL', 'This shift has reached capacity.');
  try {
    let assignment;
    if (previous) {
      const changed = await VolunteerAssignment.updateOne({ _id: previous._id, status: 'cancelled' }, { $set: { eventId: slot.eventId, status: 'assigned', assignedBy: req.auth.userId } });
      if (!changed.modifiedCount) throw fail(409, 'ALREADY_ASSIGNED', 'This member already has an active assignment for this shift.');
      assignment = await VolunteerAssignment.findById(previous._id);
    } else assignment = await VolunteerAssignment.create({ slotId: slot._id, eventId: slot.eventId, userId: req.body.userId, status: 'assigned', assignedBy: req.auth.userId });
    await recordAudit(req, { action: 'volunteer.assign', resourceType: 'VolunteerAssignment', resourceId: assignment._id, metadata: { eventId: String(slot.eventId) } });
    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    await VolunteerSlot.updateOne({ _id: slot._id }, { $inc: { reservedCount: -1 } });
    if (error.code === 11000) throw fail(409, 'ALREADY_ASSIGNED', 'This member already has an active assignment for this shift.');
    if (error.statusCode === 409) throw error;
    throw error;
  }
};

export const cancelVolunteerSignup = async (req, res) => {
  const assignment = await VolunteerAssignment.findOneAndUpdate({ _id: req.params.assignmentId, userId: req.auth.userId, status: { $in: ['signed_up', 'assigned', 'confirmed'] } }, { $set: { status: 'cancelled' } }, { new: true });
  if (!assignment) throw fail(404, 'VOLUNTEER_ASSIGNMENT_NOT_FOUND', 'Active volunteer signup not found.');
  await VolunteerSlot.updateOne({ _id: assignment.slotId }, { $inc: { reservedCount: -1 } });
  return res.json({ success: true, data: assignment });
};

export const listVolunteerRoster = async (req, res) => {
  const event = await Event.findById(req.params.eventId).select('domains').lean();
  if (!event) throw fail(404, 'EVENT_NOT_FOUND', 'Event not found.');
  if (req.auth.roles.includes('domain_admin') && !req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role)) && !event.domains.some((domain) => req.auth.domainIds.includes(String(domain)))) throw fail(403, 'DOMAIN_SCOPE_FORBIDDEN', 'You cannot view this event roster.');
  const assignments = await VolunteerAssignment.find({ eventId: req.params.eventId, status: { $nin: ['cancelled'] } }).populate('userId', 'firstName lastName email').populate('slotId', 'title startsAt endsAt').sort({ createdAt: 1 }).lean();
  return res.json({ success: true, data: assignments });
};
