import { randomUUID } from 'node:crypto';
import { Task } from '../models/Task.js';
import { TaskAssignment } from '../models/TaskAssignment.js';
import { TaskSubmission } from '../models/TaskSubmission.js';
import { TaskSubmissionFile } from '../models/TaskSubmissionFile.js';
import { TaskComment } from '../models/TaskComment.js';
import { TaskStatusHistory } from '../models/TaskStatusHistory.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { MemberGroup } from '../models/MemberGroup.js';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { User } from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { getCloudinary } from '../config/cloudinary.js';

const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const id = (value) => String(value?._id || value || '');
const isSuper = (auth) => auth.roles?.includes('super_admin') || auth.role === 'super_admin';
const isAdmin = (auth) => auth.roles?.includes('admin') || auth.role === 'admin';
const isOpenTask = (task) => ['open', 'assigned', 'accepted', 'in_progress', 'blocked'].includes(task.status);
const groupLead = async (groupId, userId) => Boolean(id(groupId) && await GroupMembership.exists({ groupId: id(groupId), userId, role: 'lead' }));
const canManageGroup = async (groupId, userId) => {
  if (!groupId) return false;
  if (await groupLead(groupId, userId)) return true;
  const group = await MemberGroup.findById(id(groupId)).select('domainId').lean();
  return Boolean(group?.domainId && await DomainAdmin.exists({ domainId: group.domainId, userId, isActive: true }));
};
const isManager = async (task, auth) => isSuper(auth) || id(task.organizerId || task.createdBy) === id(auth.userId) || await canManageGroup(task.groupId, auth.userId);
const assigned = async (taskId, userId) => TaskAssignment.exists({ taskId, userId, status: { $ne: 'declined' } });
const safeTaskNotification = (payload) => createNotification(payload).catch((error) => { console.error('[Task notification] Failed to create notification', error); return null; });
const notifyUsers = async ({ recipients, actorId, type = 'task', title, message, task, suffix = '' }) => {
  const uniqueIds = [...new Set(recipients.map((item) => id(item)).filter((item) => item && item !== id(actorId)))];
  await Promise.all(uniqueIds.map((recipient) => safeTaskNotification({ recipient, type, title, message, href: `/tasks/${task._id}`, relatedModel: 'Task', relatedId: task._id, dedupeKey: suffix ? `task:${task._id}:${suffix}:${recipient}` : undefined })));
};
const groupRecipients = async (task) => {
  if (task.groupId) return TaskAssignment.find({ taskId: task._id }).distinct('userId');
  return User.find({ isActive: true }).distinct('_id');
};
const ensureAssignments = async (task) => {
  if (!task.groupId || !task.assignWholeGroup || !isOpenTask(task)) return;
  const groupId = id(task.groupId);
  const userIds = await GroupMembership.find({ groupId }).distinct('userId');
  if (userIds.length) {
    await TaskAssignment.bulkWrite(userIds.map((userId) => ({
      updateOne: {
        filter: { taskId: task._id, userId },
        update: { $setOnInsert: { taskId: task._id, userId, assignedBy: task.organizerId || task.createdBy, status: 'assigned' } },
        upsert: true,
      },
    })), { ordered: false });
  }
};
const visibleTask = async (task, auth) => {
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (isSuper(auth) || isAdmin(auth) || await isManager(task, auth)) return { task, manager: await isManager(task, auth), viewOnly: isAdmin(auth) && !await isManager(task, auth) };
  if (task.groupId) {
    if (await GroupMembership.exists({ groupId: id(task.groupId), userId: auth.userId }) && await assigned(task._id, auth.userId)) return { task, manager: false, viewOnly: false };
    throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  }
  if (await assigned(task._id, auth.userId)) return { task, manager: false, viewOnly: false };
  throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
};
const signedFile = (file) => {
  const cloudinary = getCloudinary();
  const resourceType = file.fileType.startsWith('image/') ? 'image' : file.fileType.startsWith('video/') ? 'video' : 'raw';
  const options = { secure: true, sign_url: true, type: 'authenticated', resource_type: resourceType, expires_at: Math.floor(Date.now() / 1000) + 900 };
  const url = cloudinary.url(file.filePath, options);
  const downloadUrl = cloudinary.url(file.filePath, { ...options, attachment: file.fileName });
  return { ...file, url, downloadUrl };
};
const summaryFor = (submission) => submission?.status || 'not_started';
const memberNames = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Member';
const taskPopulate = (query) => query.populate('groupId', 'name type').populate('createdBy', 'firstName lastName email avatarUrl').populate('organizerId', 'firstName lastName email avatarUrl').populate('domain', 'name slug');

export const listWorkflowTasks = async (req, res) => {
  const filter = {};
  if (req.query.status === 'completed') filter.status = { $in: ['closed', 'completed', 'cancelled'] };
  else if (req.query.status === 'active') filter.status = { $nin: ['closed', 'completed', 'cancelled'] };
  if (req.query.groupId && req.query.groupId !== 'all') filter.groupId = req.query.groupId === 'club' ? null : req.query.groupId;
  const tasks = await taskPopulate(Task.find(filter).sort({ dueAt: 1, deadline: 1, createdAt: -1 })).lean();
  const items = [];
  for (const task of tasks) {
    await ensureAssignments(task);
    const access = await visibleTask(task, req.auth).catch(() => null);
    if (!access) continue;
    const assignmentRows = await TaskAssignment.find({ taskId: task._id }).select('userId').lean();
    const submissions = await TaskSubmission.find({ taskId: task._id }).select('userId status').lean();
    const mySubmission = submissions.find((item) => id(item.userId) === id(req.auth.userId));
    const mine = await assigned(task._id, req.auth.userId);
    const isLate = !mySubmission && (task.dueAt || task.deadline) && new Date(task.dueAt || task.deadline) < new Date();
    const canSeeProgress = isSuper(req.auth) || isAdmin(req.auth) || access.manager;
    items.push({ ...task, dueAt: task.dueAt || task.deadline, group: task.groupId || task.domain, organizer: task.organizerId || task.createdBy, canManage: access.manager, viewOnly: access.viewOnly, myStatus: !mine ? null : mySubmission ? summaryFor(mySubmission) : isLate ? 'overdue' : 'not_started', mySubmission: id(mySubmission?._id) || null, progress: canSeeProgress ? { assigned: assignmentRows.length, submitted: submissions.filter((item) => item.status !== 'withdrawn').length, approved: submissions.filter((item) => item.status === 'approved').length } : null });
  }
  const leadGroupIds = await GroupMembership.find({ userId: req.auth.userId, role: 'lead' }).distinct('groupId');
  const domainIds = await DomainAdmin.find({ userId: req.auth.userId, isActive: true }).distinct('domainId');
  const leadGroups = await MemberGroup.find({ $or: [{ _id: { $in: leadGroupIds } }, { domainId: { $in: domainIds } }], isArchived: false }).select('name type').lean();
  const memberGroupIds = await GroupMembership.find({ userId: req.auth.userId }).distinct('groupId');
  const userGroupIds = [...new Set([...memberGroupIds.map(String), ...leadGroups.map((group) => String(group._id))])];
  const filterGroups = isAdmin(req.auth) || isSuper(req.auth)
    ? await MemberGroup.find({ isArchived: false }).select('name type').lean()
    : userGroupIds.length ? await MemberGroup.find({ _id: { $in: userGroupIds }, isArchived: false }).select('name type').lean() : [];
  return res.json({ success: true, data: { items, canCreate: isSuper(req.auth) || leadGroups.length > 0, leadGroups: isSuper(req.auth) ? await MemberGroup.find({ isArchived: false }).select('name type').lean() : leadGroups, filterGroups, isAdmin: isAdmin(req.auth), isSuperAdmin: isSuper(req.auth) } });
};

export const createWorkflowTask = async (req, res) => {
  const { title, description = '', groupId = null, dueAt, priority = 'medium', requiresSubmission = true, submissionTypeHint = '', userIds } = req.body;
  if (!isSuper(req.auth) && !groupId) throw fail(403, 'CLUB_TASK_FORBIDDEN', 'Only the super admin can create a club-wide task.');
  let group = null;
  if (groupId) {
    group = await MemberGroup.findOne({ _id: groupId, isArchived: false });
    if (!group) throw fail(400, 'INVALID_GROUP', 'Choose an active group.');
    if (!isSuper(req.auth) && !await canManageGroup(group._id, req.auth.userId)) throw fail(403, 'GROUP_SCOPE_FORBIDDEN', 'You can create tasks only for groups you lead.');
  }
  const assignees = userIds?.length ? [...new Set(userIds.map(String))] : group ? (await GroupMembership.find({ groupId: group._id }).distinct('userId')).map(String) : (await User.find({ isActive: true }).distinct('_id')).map(String);
  if (!assignees.length) throw fail(400, 'ASSIGNEE_REQUIRED', 'This task needs at least one assigned member.');
  if (group && userIds?.length) {
    const members = new Set((await GroupMembership.find({ groupId: group._id }).distinct('userId')).map(String));
    if (assignees.some((userId) => !members.has(userId))) throw fail(400, 'INVALID_ASSIGNEE', 'Every selected member must belong to this group.');
  }
  const task = await Task.create({ title, description, groupId: group?._id || null, organizerId: req.auth.userId, createdBy: req.auth.userId, dueAt: new Date(dueAt), deadline: new Date(dueAt), priority, requiresSubmission: Boolean(requiresSubmission), submissionTypeHint, assignWholeGroup: !userIds?.length, status: 'open', domain: group?.domainId || null });
  try {
    await TaskAssignment.insertMany(assignees.map((userId) => ({ taskId: task._id, userId, assignedBy: req.auth.userId, status: 'assigned' })), { ordered: false });
    await TaskStatusHistory.create({ taskId: task._id, toStatus: 'open', changedBy: req.auth.userId, note: 'Task created.' });
  } catch (error) {
    await Promise.all([TaskAssignment.deleteMany({ taskId: task._id }), TaskStatusHistory.deleteMany({ taskId: task._id }), Task.deleteOne({ _id: task._id })]);
    throw error;
  }
  const groupName = group?.name || 'the club';
  await notifyUsers({ recipients: assignees, actorId: req.auth.userId, title: `New task for ${groupName}: ${title}`, message: `Due ${new Date(dueAt).toLocaleString()}`, task, suffix: 'created' });
  return res.status(201).json({ success: true, data: task });
};

export const listTaskGroupMembers = async (req, res) => {
  const group = await MemberGroup.findOne({ _id: req.params.groupId, isArchived: false }).select('_id');
  if (!group) throw fail(404, 'GROUP_NOT_FOUND', 'Group not found.');
  if (!isSuper(req.auth) && !await canManageGroup(group._id, req.auth.userId)) throw fail(403, 'GROUP_SCOPE_FORBIDDEN', 'You can only choose members from groups you manage.');
  const members = await GroupMembership.find({ groupId: group._id }).populate('userId', 'firstName lastName email profilePhoto').sort({ joinedAt: 1 }).lean();
  return res.json({ success: true, data: members });
};

export const getWorkflowTask = async (req, res) => {
  const task = await taskPopulate(Task.findById(req.params.id));
  await ensureAssignments(task);
  const access = await visibleTask(task, req.auth);
  const [assignees, allSubmissions, comments, activity] = await Promise.all([
    TaskAssignment.find({ taskId: task._id }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskSubmission.find({ taskId: task._id }).populate('userId', 'firstName lastName email avatarUrl').sort({ submittedAt: -1 }).lean(),
    TaskComment.find({ taskId: task._id }).populate('userId', 'firstName lastName avatarUrl').sort({ createdAt: 1 }).lean(),
    TaskStatusHistory.find({ taskId: task._id }).populate('changedBy', 'firstName lastName').sort({ changedAt: 1 }).lean(),
  ]);
  const mine = allSubmissions.find((submission) => id(submission.userId) === id(req.auth.userId));
  const canViewAll = isSuper(req.auth) || isAdmin(req.auth) || access.manager;
  const submissions = canViewAll ? allSubmissions : mine ? [mine] : [];
  const decorated = await Promise.all(submissions.map(async (submission) => {
    const files = await TaskSubmissionFile.find({ submissionId: submission._id, version: submission.version }).lean();
    const history = await Promise.all((submission.history || []).map(async (version) => {
      const previousFiles = await TaskSubmissionFile.find({ submissionId: submission._id, version: version.version }).lean();
      const versionData = typeof version.toObject === 'function' ? version.toObject() : version;
      return { ...versionData, files: previousFiles.map(signedFile) };
    }));
    return { ...submission, files: files.map(signedFile), history };
  }));
  const taskDueAt = task.dueAt || task.deadline;
  const people = canViewAll ? await Promise.all(assignees.map(async (assignment) => {
    const found = decorated.find((submission) => id(submission.userId) === id(assignment.userId));
    const submission = found?.status === 'withdrawn' ? null : found || null;
    return { ...assignment, submission, status: submission?.status || (taskDueAt && new Date(taskDueAt) < new Date() ? 'overdue' : 'not_started') };
  })) : [];
  const [managedGroupIds, managedDomainIds] = await Promise.all([
    GroupMembership.find({ userId: req.auth.userId, role: 'lead' }).distinct('groupId'),
    DomainAdmin.find({ userId: req.auth.userId, isActive: true }).distinct('domainId'),
  ]);
  const managerGroupQuery = [{ _id: { $in: managedGroupIds } }, { domainId: { $in: managedDomainIds } }];
  const groupOptions = isSuper(req.auth)
    ? await MemberGroup.find({ isArchived: false }).select('name type').lean()
    : await MemberGroup.find({ isArchived: false, $or: managerGroupQuery }).select('name type').lean();
  if (access.manager && task.groupId && !groupOptions.some((group) => id(group._id) === id(task.groupId))) {
    const currentGroup = await MemberGroup.findById(id(task.groupId)).select('name type').lean();
    if (currentGroup) groupOptions.push(currentGroup);
  }
  return res.json({ success: true, data: { task, canManage: access.manager, viewOnly: access.viewOnly, canReview: access.manager, canDelete: isSuper(req.auth), isSuperAdmin: isSuper(req.auth), groupOptions, isAssigned: Boolean(await assigned(task._id, req.auth.userId)), submission: mine ? decorated.find((item) => id(item._id) === id(mine._id)) : null, submissions: canViewAll ? decorated : [], members: people, comments: canViewAll ? comments : [], activity: canViewAll ? activity : [] } });
};

export const updateWorkflowTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!await isManager(task, req.auth)) throw fail(403, 'TASK_MANAGE_FORBIDDEN', 'You cannot change this task.');
  const beforeDue = task.dueAt || task.deadline;
  const beforeStatus = task.status;
  const previousGroupId = id(task.groupId);
  let oldAssignees = [];
  let newAssignees = [];
  for (const field of ['title', 'description', 'priority', 'requiresSubmission', 'submissionTypeHint']) if (req.body[field] !== undefined) task[field] = req.body[field];
  if (req.body.dueAt !== undefined) { task.dueAt = new Date(req.body.dueAt); task.deadline = task.dueAt; }
  if (req.body.groupId !== undefined && id(req.body.groupId) !== previousGroupId) {
    const nextGroup = req.body.groupId ? await MemberGroup.findOne({ _id: req.body.groupId, isArchived: false }) : null;
    if (req.body.groupId && !nextGroup) throw fail(400, 'INVALID_GROUP', 'Choose an active group.');
    if (!nextGroup && !isSuper(req.auth)) throw fail(403, 'CLUB_TASK_FORBIDDEN', 'Only the super admin can make a task club-wide.');
    if (nextGroup && !isSuper(req.auth) && !await canManageGroup(nextGroup._id, req.auth.userId)) throw fail(403, 'GROUP_SCOPE_FORBIDDEN', 'You can move this task only to a group you manage.');
    oldAssignees = await TaskAssignment.find({ taskId: task._id }).distinct('userId');
    if (nextGroup && task.assignWholeGroup) newAssignees = await GroupMembership.find({ groupId: nextGroup._id }).distinct('userId');
    else if (nextGroup) {
      const nextMembers = new Set((await GroupMembership.find({ groupId: nextGroup._id }).distinct('userId')).map(String));
      newAssignees = oldAssignees.filter((userId) => nextMembers.has(String(userId)));
    } else {
      task.assignWholeGroup = true;
      newAssignees = await User.find({ isActive: true }).distinct('_id');
    }
    if (!newAssignees.length) throw fail(409, 'NO_ELIGIBLE_ASSIGNEES', 'The selected group has no assigned members. Choose a group with members or update the task assignees first.');
    task.groupId = nextGroup?._id || null;
    task.domain = nextGroup?.domainId || null;
  }
  if (req.body.status !== undefined) {
    if (!['open', 'closed', 'cancelled'].includes(req.body.status)) throw fail(400, 'INVALID_TASK_STATUS', 'Choose a valid task status.');
    task.status = req.body.status;
  }
  await task.save();
  if (previousGroupId !== id(task.groupId)) {
    await TaskAssignment.deleteMany({ taskId: task._id });
    if (newAssignees.length) await TaskAssignment.insertMany(newAssignees.map((userId) => ({ taskId: task._id, userId, assignedBy: req.auth.userId, status: 'assigned' })), { ordered: false });
    await TaskStatusHistory.create({ taskId: task._id, fromStatus: task.status, toStatus: task.status, changedBy: req.auth.userId, note: 'Task audience changed.' });
    await notifyUsers({ recipients: oldAssignees.filter((userId) => !newAssignees.some((nextId) => String(nextId) === String(userId))), actorId: req.auth.userId, title: `Removed from task: ${task.title}`, message: 'The task group was changed.', task, suffix: `group-removed-${task.updatedAt.getTime()}` });
    const nextGroup = task.groupId ? await MemberGroup.findById(task.groupId).select('name').lean() : null;
    await notifyUsers({ recipients: newAssignees, actorId: req.auth.userId, title: `Task for ${nextGroup?.name || 'the club'}: ${task.title}`, message: `Due ${new Date(task.dueAt || task.deadline).toLocaleString()}`, task, suffix: `group-added-${task.updatedAt.getTime()}` });
  }
  if (String(beforeDue) !== String(task.dueAt || task.deadline)) await TaskStatusHistory.create({ taskId: task._id, fromStatus: beforeStatus, toStatus: task.status, changedBy: req.auth.userId, note: `Deadline changed to ${new Date(task.dueAt || task.deadline).toLocaleString()}.` });
  if (beforeStatus !== task.status) await TaskStatusHistory.create({ taskId: task._id, fromStatus: beforeStatus, toStatus: task.status, changedBy: req.auth.userId, note: task.status === 'cancelled' ? 'Task cancelled.' : task.status === 'closed' ? 'Task closed.' : 'Task reopened.' });
  if (String(beforeDue) !== String(task.dueAt || task.deadline)) await notifyUsers({ recipients: await groupRecipients(task), actorId: req.auth.userId, title: `Deadline changed: ${task.title}`, message: `New due date: ${new Date(task.dueAt || task.deadline).toLocaleString()}`, task, suffix: `deadline-${task.updatedAt.getTime()}` });
  if (task.status === 'cancelled') await notifyUsers({ recipients: await groupRecipients(task), actorId: req.auth.userId, title: `Task cancelled: ${task.title}`, message: 'This task is no longer accepting work.', task, suffix: 'cancelled' });
  return res.json({ success: true, data: task });
};

const uploadPrivate = async (file, task, userId) => {
  const ext = file.originalname.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
  const resourceType = file.mimetype.startsWith('image/') ? 'image' : file.mimetype.startsWith('video/') ? 'video' : 'raw';
  const result = await new Promise((resolve, reject) => getCloudinary().uploader.upload_stream({ resource_type: resourceType, type: 'authenticated', public_id: `tasks/${task._id}/${userId}/${randomUUID()}.${ext}`, overwrite: false, use_filename: false }, (error, uploaded) => error ? reject(error) : resolve(uploaded)).end(file.buffer));
  return { publicId: result.public_id, resourceType };
};

export const submitWorkflowTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!await assigned(task._id, req.auth.userId)) throw fail(403, 'TASK_NOT_ASSIGNED', 'You are not assigned to this task.');
  if (!isOpenTask(task)) throw fail(409, 'TASK_CLOSED', 'This task is no longer accepting work.');
  if (task.requiresSubmission && !(req.files || []).length && !req.body.link) throw fail(400, 'SUBMISSION_REQUIRED', 'Upload at least one file or add a link.');
  if (req.body.link && !/^https?:\/\//i.test(req.body.link)) throw fail(400, 'INVALID_LINK', 'Enter a valid http or https link.');
  let submission = await TaskSubmission.findOne({ taskId: task._id, userId: req.auth.userId });
  if (submission?.status === 'approved') throw fail(409, 'ALREADY_APPROVED', 'Approved work cannot be changed.');
  if (submission?.status === 'submitted') throw fail(409, 'ALREADY_SUBMITTED', 'Withdraw your current submission before replacing it.');
  const previousStatus = submission?.status || '';
  const nextVersion = (submission?.version || 0) + 1;
  const oldFiles = submission ? await TaskSubmissionFile.find({ submissionId: submission._id, version: submission.version }).lean() : [];
  if (!submission) submission = new TaskSubmission({ taskId: task._id, userId: req.auth.userId });
  else if (submission.version > 0) submission.history.push({ version: submission.version, note: submission.note, link: submission.link, status: submission.status === 'withdrawn' ? submission.withdrawnFromStatus || 'submitted' : submission.status, submittedAt: submission.submittedAt, isLate: submission.isLate, files: oldFiles.map(({ filePath, fileName, fileType, fileSize }) => ({ filePath, fileName, fileType, fileSize })), reviewedAt: submission.reviewedAt, reviewComment: submission.reviewComment });
  submission.note = req.body.note || '';
  submission.link = req.body.link || '';
  submission.status = 'submitted';
  submission.submittedAt = new Date();
  submission.reviewedBy = null; submission.reviewedAt = null; submission.reviewComment = '';
  submission.withdrawnFromStatus = '';
  submission.isLate = Boolean((task.dueAt || task.deadline) && new Date() > new Date(task.dueAt || task.deadline));
  submission.version = nextVersion;
  const stored = [];
  try {
    for (const file of req.files || []) {
      const privateAsset = await uploadPrivate(file, task, req.auth.userId);
      stored.push({ taskId: task._id, submissionId: submission._id, userId: req.auth.userId, filePath: privateAsset.publicId, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size, version: nextVersion });
    }
    if (stored.length) await TaskSubmissionFile.insertMany(stored);
    await submission.save();
  } catch (error) {
    await TaskSubmissionFile.deleteMany({ taskId: task._id, submissionId: submission._id, version: nextVersion }).catch(() => {});
    await Promise.all(stored.map((file) => {
      const resourceType = file.fileType.startsWith('image/') ? 'image' : file.fileType.startsWith('video/') ? 'video' : 'raw';
      return getCloudinary().uploader.destroy(file.filePath, { resource_type: resourceType, type: 'authenticated', invalidate: true }).catch(() => {});
    }));
    console.error('[Task upload] Private storage upload failed', error);
    throw fail(502, 'TASK_FILE_UPLOAD_FAILED', 'Could not upload one or more files. Please try again.');
  }
  await TaskStatusHistory.create({ taskId: task._id, fromStatus: previousStatus, toStatus: 'submitted', changedBy: req.auth.userId, note: `Submission version ${nextVersion} received.` });
  const creator = id(task.organizerId || task.createdBy);
  await notifyUsers({ recipients: [creator], actorId: req.auth.userId, title: `${memberNames(await User.findById(req.auth.userId))} submitted ${task.title}`, message: `Submission version ${nextVersion} is ready to review.`, task, suffix: `submitted-${req.auth.userId}-${nextVersion}` });
  return res.status(201).json({ success: true, data: submission });
};

export const withdrawWorkflowSubmission = async (req, res) => {
  const submission = await TaskSubmission.findOne({ taskId: req.params.id, userId: req.auth.userId });
  if (!submission || submission.status !== 'submitted') throw fail(409, 'CANNOT_WITHDRAW', 'Only unreviewed submissions can be withdrawn.');
  const task = await Task.findById(req.params.id);
  if (!task || !isOpenTask(task)) throw fail(409, 'TASK_CLOSED', 'This task is no longer accepting work.');
  submission.withdrawnFromStatus = submission.status;
  submission.status = 'withdrawn'; await submission.save();
  return res.json({ success: true, data: submission });
};

export const reviewWorkflowSubmission = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!await isManager(task, req.auth)) throw fail(403, 'TASK_REVIEW_FORBIDDEN', 'You cannot review this task.');
  const submission = await TaskSubmission.findOne({ taskId: task._id, userId: req.params.userId });
  if (!submission || submission.status === 'withdrawn') throw fail(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
  if (!['approved', 'changes_requested'].includes(req.body.status)) throw fail(400, 'INVALID_REVIEW', 'Choose Approve or Request changes.');
  const reviewComment = String(req.body.reviewComment || '').trim();
  if (req.body.status === 'changes_requested' && !reviewComment) throw fail(400, 'REVIEW_COMMENT_REQUIRED', 'Add a comment explaining the requested changes.');
  submission.status = req.body.status; submission.reviewedBy = req.auth.userId; submission.reviewedAt = new Date(); submission.reviewComment = reviewComment;
  await submission.save();
  await TaskStatusHistory.create({ taskId: task._id, fromStatus: 'submitted', toStatus: req.body.status, changedBy: req.auth.userId, note: reviewComment || 'Submission reviewed.' });
  if (id(submission.userId) !== id(req.auth.userId)) await safeTaskNotification({ recipient: submission.userId, type: 'task', title: req.body.status === 'approved' ? `Your work for ${task.title} was approved` : `Changes requested for ${task.title}`, message: reviewComment || 'Open the task to see your submission status.', href: `/tasks/${task._id}`, relatedModel: 'Task', relatedId: task._id, dedupeKey: `task-review:${submission._id}:${submission.version}:${req.body.status}` });
  return res.json({ success: true, data: submission });
};

export const commentOnWorkflowTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  const access = await visibleTask(task, req.auth);
  if (!access.manager && !isAdmin(req.auth)) throw fail(403, 'TASK_COMMENT_FORBIDDEN', 'You cannot comment on this task.');
  const comment = await TaskComment.create({ taskId: task._id, userId: req.auth.userId, body: req.body.body });
  return res.status(201).json({ success: true, data: comment });
};

export const remindWorkflowTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  const access = await visibleTask(task, req.auth);
  if (!access.manager && !isAdmin(req.auth)) throw fail(403, 'TASK_REMINDER_FORBIDDEN', 'You cannot send reminders for this task.');
  const submitted = new Set(await TaskSubmission.find({ taskId: task._id, status: { $ne: 'withdrawn' } }).distinct('userId').then((list) => list.map(String)));
  const recipients = await TaskAssignment.find({ taskId: task._id }).distinct('userId');
  const pending = recipients.filter((recipient) => !submitted.has(String(recipient)));
  const reminderWindow = new Date().toISOString().slice(0, 13);
  await notifyUsers({ recipients: pending, actorId: req.auth.userId, title: `Reminder: ${task.title}`, message: 'Please submit your work before the deadline.', task, suffix: `manual-reminder-${reminderWindow}` });
  return res.json({ success: true, data: { notified: pending.length } });
};

export const approveAllWorkflowSubmissions = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!await isManager(task, req.auth)) throw fail(403, 'TASK_REVIEW_FORBIDDEN', 'You cannot review this task.');
  const submissions = await TaskSubmission.find({ taskId: task._id, status: 'submitted' });
  await Promise.all(submissions.map(async (submission) => {
    submission.status = 'approved'; submission.reviewedBy = req.auth.userId; submission.reviewedAt = new Date(); await submission.save();
    if (id(submission.userId) !== id(req.auth.userId)) await safeTaskNotification({ recipient: submission.userId, type: 'task', title: `Your work for ${task.title} was approved`, message: 'Your submission was approved.', href: `/tasks/${task._id}`, relatedModel: 'Task', relatedId: task._id, dedupeKey: `task-review:${submission._id}:${submission.version}:approved` });
  }));
  return res.json({ success: true, data: { approved: submissions.length } });
};

export const closeWorkflowTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  if (!await isManager(task, req.auth)) throw fail(403, 'TASK_MANAGE_FORBIDDEN', 'You cannot close this task.');
  const previousStatus = task.status;
  task.status = req.body.status;
  await task.save();
  await TaskStatusHistory.create({ taskId: task._id, fromStatus: previousStatus, toStatus: task.status, changedBy: req.auth.userId, note: task.status === 'cancelled' ? 'Task cancelled.' : 'Task closed.' });
  if (task.status === 'cancelled') await notifyUsers({ recipients: await groupRecipients(task), actorId: req.auth.userId, title: `Task cancelled: ${task.title}`, message: 'This task is no longer accepting work.', task, suffix: 'cancelled' });
  return res.json({ success: true, data: task });
};

export const deleteWorkflowTask = async (req, res) => {
  if (!isSuper(req.auth)) throw fail(403, 'SUPER_ADMIN_REQUIRED', 'Only the super admin can delete tasks.');
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  const submissions = await TaskSubmission.find({ taskId: task._id }).select('_id').lean();
  const files = await TaskSubmissionFile.find({ taskId: task._id }).lean();
  await Promise.all(files.map(async (file) => {
    const resourceType = file.fileType.startsWith('image/') ? 'image' : file.fileType.startsWith('video/') ? 'video' : 'raw';
    try { await getCloudinary().uploader.destroy(file.filePath, { resource_type: resourceType, type: 'authenticated', invalidate: true }); }
    catch (error) { console.error('[Task delete] Private file cleanup failed', error); }
  }));
  await Promise.all([
    TaskAssignment.deleteMany({ taskId: task._id }), TaskSubmission.deleteMany({ taskId: task._id }),
    TaskSubmissionFile.deleteMany({ taskId: task._id }), TaskComment.deleteMany({ taskId: task._id }),
    TaskStatusHistory.deleteMany({ taskId: task._id }), Task.deleteOne({ _id: task._id }),
  ]);
  return res.json({ success: true, data: { deleted: true } });
};

export const reassignWorkflowTask = async (req, res) => {
  if (!isSuper(req.auth)) throw fail(403, 'SUPER_ADMIN_REQUIRED', 'Only the super admin can reassign a task.');
  const task = await Task.findById(req.params.id);
  if (!task) throw fail(404, 'TASK_NOT_FOUND', 'Task not found.');
  const userIds = [...new Set((req.body.userIds || []).map(String))];
  if (!userIds.length) throw fail(400, 'ASSIGNEE_REQUIRED', 'Choose at least one assigned member.');
  if (task.groupId) {
    const groupMembers = new Set((await GroupMembership.find({ groupId: task.groupId }).distinct('userId')).map(String));
    if (userIds.some((userId) => !groupMembers.has(userId))) throw fail(400, 'INVALID_ASSIGNEE', 'Selected members must belong to this task’s group.');
  }
  const activeUsers = new Set((await User.find({ _id: { $in: userIds }, isActive: true }).distinct('_id')).map(String));
  if (activeUsers.size !== userIds.length) throw fail(400, 'INVALID_ASSIGNEE', 'One or more selected members are inactive or do not exist.');
  const previous = await TaskAssignment.find({ taskId: task._id }).distinct('userId');
  await TaskAssignment.deleteMany({ taskId: task._id, userId: { $nin: userIds } });
  await TaskAssignment.bulkWrite(userIds.map((userId) => ({
    updateOne: {
      filter: { taskId: task._id, userId },
      update: { $set: { status: 'assigned' }, $setOnInsert: { taskId: task._id, userId, assignedBy: req.auth.userId } },
      upsert: true,
    },
  })), { ordered: false });
  await notifyUsers({ recipients: previous.filter((userId) => !userIds.includes(String(userId))), actorId: req.auth.userId, title: `Removed from task: ${task.title}`, message: 'Your assignment has been updated.', task, suffix: `removed-${Date.now()}` });
  await notifyUsers({ recipients: userIds.filter((userId) => !previous.some((old) => String(old) === userId)), actorId: req.auth.userId, title: `New task assignment: ${task.title}`, message: `Due ${new Date(task.dueAt || task.deadline).toLocaleString()}`, task, suffix: `assigned-${Date.now()}` });
  return res.json({ success: true, data: { userIds } });
};
