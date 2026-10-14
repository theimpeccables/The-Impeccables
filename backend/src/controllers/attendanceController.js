import mongoose from 'mongoose';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Meeting } from '../models/Meeting.js';
import { MeetingResponse } from '../models/MeetingResponse.js';
import { User } from '../models/User.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { MemberGroup } from '../models/MemberGroup.js';
import { createNotification } from '../services/notificationService.js';
import { recordAudit } from '../services/auditService.js';

const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const isAdmin = (req) => req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role));
const groupIdsOf = (meeting) => (meeting.groupIds?.length ? meeting.groupIds : meeting.groupId ? [meeting.groupId] : []).map((group) => group._id || group);
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);
const getMeeting = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const meeting = await Meeting.findById(id).populate('groupIds', 'name type').populate('groupId', 'name type').populate('organizerId', 'firstName lastName profilePhoto').populate('createdBy', 'firstName lastName profilePhoto').lean();
  return meeting ? { ...meeting, status: meeting.status || (meeting.isActive === false ? 'cancelled' : 'upcoming') } : null;
};
const userGroupIds = async (userId) => GroupMembership.find({ userId }).distinct('groupId');
const isMeetingMember = async (req, meeting) => {
  const groups = groupIdsOf(meeting);
  if (!groups.length) {
    if (meeting.eligibleMembers?.length) return meeting.eligibleMembers.some((id) => sameId(id, req.auth.userId));
    return true;
  }
  const own = await userGroupIds(req.auth.userId);
  return groups.some((id) => own.some((mine) => sameId(id, mine)));
};
const isOrganizer = (req, meeting) => sameId(meeting.organizerId || meeting.createdBy, req.auth.userId);
const isLeadForMeeting = async (req, meeting) => {
  const groups = groupIdsOf(meeting);
  if (!groups.length) return false;
  return Boolean(await GroupMembership.exists({ userId: req.auth.userId, role: 'lead', groupId: { $in: groups } }));
};
const canManage = async (req, meeting) => isAdmin(req) || isOrganizer(req, meeting) || isLeadForMeeting(req, meeting);
const requireManager = async (req, meeting) => {
  if (!await canManage(req, meeting)) throw fail(403, 'MEETING_MANAGE_FORBIDDEN', 'Only the organizer, a group lead, or an admin can manage this meeting.');
};
const activeMembersFor = async (meeting) => {
  const groups = groupIdsOf(meeting);
  if (!groups.length) {
    const query = { isActive: true };
    if (meeting.eligibleMembers?.length) query._id = { $in: meeting.eligibleMembers };
    return User.find(query).select('firstName lastName email profilePhoto').sort({ lastName: 1, firstName: 1 }).lean();
  }
  const memberIds = await GroupMembership.find({ groupId: { $in: groups } }).distinct('userId');
  return User.find({ _id: { $in: memberIds }, isActive: true }).select('firstName lastName email profilePhoto').sort({ lastName: 1, firstName: 1 }).lean();
};
const rsvpFor = (meetingId, userId) => MeetingResponse.findOne({ meetingId, userId }).lean();
const attendanceFor = (meetingId, userId) => AttendanceRecord.findOne({ meetingId, userId }).lean();
const summarize = (rows) => rows.reduce((result, row) => {
  if (row.status === 'present') result.present += 1;
  else if (row.status === 'absent') result.absent += 1;
  else if (row.status === 'excused') result.excused += 1;
  else result.notMarked += 1;
  return result;
}, { present: 0, absent: 0, excused: 0, notMarked: 0 });
const notifyMembers = async (meeting, { title, message, exceptUserId }) => {
  const groups = groupIdsOf(meeting);
  const memberIds = groups.length ? await GroupMembership.find({ groupId: { $in: groups } }).distinct('userId') : await User.find({ isActive: true }).distinct('_id');
  const unique = [...new Set(memberIds.map(String))].filter((id) => id !== String(exceptUserId || meeting.createdBy));
  await Promise.all(unique.map((recipient) => createNotification({ recipient, type: 'meeting', title, message, href: `/meetings/${meeting._id}`, relatedModel: 'Meeting', relatedId: meeting._id })));
};

export const listMeetings = async (req, res) => {
  const all = await Meeting.find({}).sort({ date: 1 }).populate('groupIds', 'name type').populate('groupId', 'name type').populate('organizerId', 'firstName lastName profilePhoto').populate('createdBy', 'firstName lastName profilePhoto').lean();
  const visible = [];
  for (const meeting of all) {
    if (meeting.status === 'cancelled' || meeting.isActive === false) continue;
    const admin = isAdmin(req);
    const manager = admin || isOrganizer(req, meeting) || await isLeadForMeeting(req, meeting);
    if (!manager && !await isMeetingMember(req, meeting)) continue;
    const members = await activeMembersFor(meeting);
    const memberIds = members.map((user) => user._id);
    const [rsvps, finalRows, ownRsvp, ownFinal] = await Promise.all([
      manager ? MeetingResponse.find({ meetingId: meeting._id, userId: { $in: memberIds } }).select('status').lean() : Promise.resolve([]),
      manager ? AttendanceRecord.find({ meetingId: meeting._id, userId: { $in: memberIds } }).select('userId status notes').lean() : Promise.resolve([]),
      rsvpFor(meeting._id, req.auth.userId), attendanceFor(meeting._id, req.auth.userId),
    ]);
    const safeMeeting = { ...meeting }; delete safeMeeting.eligibleMembers;
    if (!manager && meeting.status !== 'completed') safeMeeting.conclusion = null;
    visible.push({ ...safeMeeting, status: meeting.status || 'upcoming', groups: meeting.groupIds?.length ? meeting.groupIds : meeting.groupId ? [meeting.groupId] : [], organizer: meeting.organizerId || meeting.createdBy, canManage: manager, ownRsvp, ownFinal, ...(manager ? { rsvpSummary: { attending: rsvps.filter((r) => r.status === 'attending').length, notAttending: rsvps.filter((r) => r.status === 'not_attending').length, noReply: Math.max(0, members.length - rsvps.length) }, attendanceSummary: summarize(finalRows), memberCount: members.length } : {}) });
  }
  return res.json({ success: true, data: visible });
};

export const getMeetingDetail = async (req, res) => {
  const meeting = await getMeeting(req.params.meetingId);
  if (!meeting || meeting.isActive === false || meeting.status === 'cancelled') throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  const manager = await canManage(req, meeting);
  if (!manager && !await isMeetingMember(req, meeting)) throw fail(403, 'MEETING_NOT_VISIBLE', 'You are not a member of this meeting.');
  const members = await activeMembersFor(meeting);
  const [allRsvps, allAttendance, memberFinalStatuses, ownRsvp, ownAttendance] = await Promise.all([
    manager ? MeetingResponse.find({ meetingId: meeting._id }).populate('userId', 'firstName lastName email profilePhoto').lean() : Promise.resolve([]),
    AttendanceRecord.find({ meetingId: meeting._id, userId: manager ? { $in: members.map((user) => user._id) } : req.auth.userId }).populate('userId', 'firstName lastName email profilePhoto').lean(),
    manager ? Promise.resolve([]) : AttendanceRecord.find({ meetingId: meeting._id, userId: { $in: members.map((user) => user._id) } }).select('status').lean(),
    rsvpFor(meeting._id, req.auth.userId), attendanceFor(meeting._id, req.auth.userId),
  ]);
  const attendanceByUser = new Map(allAttendance.map((row) => [String(row.userId?._id || row.userId), row]));
  const rsvpByUser = new Map(allRsvps.map((row) => [String(row.userId?._id || row.userId), row]));
  const attendanceRows = manager ? members.map((user) => ({ user, rsvp: rsvpByUser.get(String(user._id)) || null, attendance: attendanceByUser.get(String(user._id)) || null })) : [];
  const summaryRows = manager ? attendanceRows.map((row) => row.attendance || { status: null }) : [];
  const safeMeeting = { ...meeting }; delete safeMeeting.eligibleMembers;
  if (!manager && meeting.status !== 'completed') safeMeeting.conclusion = null;
  return res.json({ success: true, data: { ...safeMeeting, groups: meeting.groupIds?.length ? meeting.groupIds : meeting.groupId ? [meeting.groupId] : [], organizer: meeting.organizerId || meeting.createdBy, canManage: manager, ownRsvp, ownAttendance: manager ? ownAttendance : allAttendance[0] || ownAttendance, attendanceRows, attendanceSummary: manager ? summarize(summaryRows) : meeting.status === 'completed' ? summarize(memberFinalStatuses) : undefined, memberCount: members.length, rsvpSummary: manager ? { attending: attendanceRows.filter((row) => row.rsvp?.status === 'attending').length, notAttending: attendanceRows.filter((row) => row.rsvp?.status === 'not_attending').length, noReply: attendanceRows.filter((row) => !row.rsvp).length } : undefined } });
};

export const saveMeetingResponse = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId).lean();
  if (!meeting || meeting.status === 'cancelled' || meeting.isActive === false) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  if (meeting.status === 'completed') throw fail(409, 'MEETING_RESPONSE_CLOSED', 'Responses are closed for completed meetings.');
  if (!await isMeetingMember(req, meeting)) throw fail(403, 'MEMBER_NOT_ELIGIBLE', 'You are not a member of this meeting.');
  if (req.body.status === 'not_attending' && !req.body.reason?.trim()) throw fail(400, 'RSVP_REASON_REQUIRED', 'Add a reason when you cannot attend.');
  const rsvp = await MeetingResponse.findOneAndUpdate({ meetingId: meeting._id, userId: req.auth.userId }, { $set: { status: req.body.status, reason: req.body.status === 'not_attending' ? req.body.reason.trim() : '', respondedAt: new Date() } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
  return res.json({ success: true, data: rsvp });
};

export const createMeeting = async (req, res) => {
  const groupsIds = [...new Set((req.body.groupIds || []).map(String))];
  if (!groupsIds.length) throw fail(400, 'GROUP_REQUIRED', 'Choose at least one group for this meeting.');
  const groups = await MemberGroup.find({ _id: { $in: groupsIds }, isArchived: false });
  if (groups.length !== groupsIds.length) throw fail(400, 'INVALID_GROUP', 'One or more selected groups are unavailable.');
  const admin = isAdmin(req);
  if (!admin) {
    const led = await GroupMembership.find({ userId: req.auth.userId, role: 'lead', groupId: { $in: groupsIds } }).distinct('groupId');
    if (led.length !== groupsIds.length) throw fail(403, 'GROUP_MEETING_FORBIDDEN', 'You can only schedule meetings for groups you lead.');
  }
  const organizerId = admin && req.body.organizerId ? req.body.organizerId : req.auth.userId;
  const organizer = await User.findOne({ _id: organizerId, isActive: true });
  if (!organizer) throw fail(400, 'INVALID_ORGANIZER', 'Select an active organizer.');
  const meeting = await Meeting.create({ title: req.body.title, date: req.body.date, endTime: req.body.endTime || null, venue: req.body.venue || '', meetingLink: req.body.meetingLink || '', agenda: req.body.agenda || '', groupIds: groupsIds, groupId: groupsIds.length === 1 ? groupsIds[0] : null, organizerId, createdBy: req.auth.userId, status: 'upcoming', isActive: true, eligibleMembers: [] });
  await notifyMembers(meeting, { title: `New meeting for ${groups.map((group) => group.name).join(', ')}`, message: `${meeting.title}, ${new Date(meeting.date).toLocaleString()}`, exceptUserId: req.auth.userId });
  await recordAudit(req, { action: 'meeting.create', resourceType: 'Meeting', resourceId: meeting._id });
  return res.status(201).json({ success: true, data: meeting });
};

export const updateMeeting = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status === 'completed') throw fail(409, 'MEETING_COMPLETED', 'Completed meetings cannot be edited.');
  for (const field of ['title', 'date', 'endTime', 'venue', 'meetingLink', 'agenda']) if (req.body[field] !== undefined) meeting[field] = req.body[field];
  if (isAdmin(req) && req.body.organizerId) {
    if (!await User.exists({ _id: req.body.organizerId, isActive: true })) throw fail(400, 'INVALID_ORGANIZER', 'Select an active organizer.');
    meeting.organizerId = req.body.organizerId;
  }
  if (req.body.status === 'cancelled' || req.body.isActive === false) { meeting.status = 'cancelled'; meeting.isActive = false; }
  await meeting.save();
  if (meeting.status === 'cancelled') await notifyMembers(meeting, { title: 'Meeting cancelled', message: `${meeting.title} was cancelled.`, exceptUserId: req.auth.userId });
  else if (req.body.date) await notifyMembers(meeting, { title: 'Meeting rescheduled', message: `${meeting.title} is now ${new Date(meeting.date).toLocaleString()}.`, exceptUserId: req.auth.userId });
  return res.json({ success: true, data: meeting });
};

export const saveMeetingAgenda = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status === 'completed') throw fail(409, 'MEETING_COMPLETED', 'Completed meeting details are read-only.');
  meeting.agenda = req.body.agenda;
  await meeting.save();
  return res.json({ success: true, data: { agenda: meeting.agenda } });
};

export const saveMeetingConclusion = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  meeting.conclusion = req.body.conclusion?.trim() || null;
  await meeting.save();
  return res.json({ success: true, data: { conclusion: meeting.conclusion } });
};

export const saveFinalAttendance = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting || meeting.status === 'cancelled') throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status !== 'completed' && new Date(meeting.date).getTime() > Date.now()) throw fail(409, 'ATTENDANCE_NOT_STARTED', 'Attendance can be marked once the meeting starts.');
  const members = await activeMembersFor(meeting);
  if (!members.some((user) => sameId(user._id, req.params.userId))) throw fail(400, 'MEMBER_NOT_ELIGIBLE', 'This person is not a member of the meeting group.');
  const saved = await AttendanceRecord.findOneAndUpdate({ meetingId: meeting._id, userId: req.params.userId }, { $set: { status: req.body.status, notes: req.body.note || '', markedBy: req.auth.userId, markedAt: new Date() } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
  return res.json({ success: true, data: saved });
};

export const markAllPresent = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting || meeting.status === 'cancelled') throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status !== 'completed' && new Date(meeting.date).getTime() > Date.now()) throw fail(409, 'ATTENDANCE_NOT_STARTED', 'Attendance can be marked once the meeting starts.');
  const members = await activeMembersFor(meeting);
  const now = new Date();
  await AttendanceRecord.bulkWrite(members.map((user) => ({ updateOne: { filter: { meetingId: meeting._id, userId: user._id }, update: { $set: { status: 'present', markedBy: req.auth.userId, markedAt: now } }, upsert: true } })), { ordered: false });
  return res.json({ success: true, data: { marked: members.length } });
};

export const completeMeeting = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status === 'cancelled') throw fail(409, 'MEETING_CANCELLED', 'Cancelled meetings cannot be completed.');
  if (meeting.status === 'completed') throw fail(409, 'MEETING_COMPLETED', 'This meeting is already completed.');
  if (new Date(meeting.date).getTime() > Date.now()) throw fail(409, 'MEETING_NOT_STARTED', 'A meeting can be completed once it starts.');
  const members = await activeMembersFor(meeting);
  const existing = await AttendanceRecord.find({ meetingId: meeting._id, userId: { $in: members.map((user) => user._id) } }).select('userId status').lean();
  const marked = new Set(existing.filter((row) => row.status).map((row) => String(row.userId)));
  const unmarked = members.filter((user) => !marked.has(String(user._id)));
  if (unmarked.length && req.body.confirm !== true) return res.status(200).json({ success: true, data: { requiresConfirmation: true, unmarkedCount: unmarked.length } });
  if (unmarked.length) {
    const now = new Date();
    await AttendanceRecord.bulkWrite(unmarked.map((user) => ({ updateOne: { filter: { meetingId: meeting._id, userId: user._id }, update: { $set: { status: 'absent', notes: '', markedBy: req.auth.userId, markedAt: now } }, upsert: true } })), { ordered: false });
  }
  meeting.status = 'completed'; meeting.completedAt = new Date(); await meeting.save();
  await notifyMembers(meeting, { title: `Minutes added for ${meeting.title}`, message: 'The meeting is complete. View the agenda, attendance and conclusion.', exceptUserId: req.auth.userId });
  await recordAudit(req, { action: 'meeting.complete', resourceType: 'Meeting', resourceId: meeting._id, metadata: { unmarkedCount: unmarked.length } });
  return res.json({ success: true, data: { meeting, unmarkedCount: unmarked.length } });
};

// Kept for existing callers; row-level status changes use the stricter organizer endpoint above.
export const markAttendance = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  if (meeting.status !== 'completed' && new Date(meeting.date).getTime() > Date.now()) throw fail(409, 'ATTENDANCE_NOT_STARTED', 'Attendance can be marked once the meeting starts.');
  const members = await activeMembersFor(meeting);
  const allowed = new Set(members.map((user) => String(user._id)));
  if (req.body.records.some((record) => !allowed.has(String(record.userId)))) throw fail(400, 'MEMBER_NOT_ELIGIBLE', 'Only members of this meeting can be marked.');
  const records = await Promise.all(req.body.records.map((record) => AttendanceRecord.findOneAndUpdate({ meetingId: meeting._id, userId: record.userId }, { $set: { status: record.status, markedBy: req.auth.userId, markedAt: new Date(), notes: record.notes || '' } }, { upsert: true, new: true, runValidators: true })));
  return res.json({ success: true, data: records });
};

export const getMyAttendance = async (req, res) => {
  const records = await AttendanceRecord.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).populate({ path: 'meetingId', select: 'title date venue meetingType domain status', populate: { path: 'domain', select: 'name' } }).lean();
  const present = records.filter((record) => ['present', 'late', 'left_early'].includes(record.status)).length;
  return res.json({ success: true, data: { items: records, summary: { total: records.length, present, missed: records.length - present, rate: records.length ? Math.round((present / records.length) * 100) : 0 } } });
};

export const getAttendanceReport = async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw fail(404, 'MEETING_NOT_FOUND', 'Meeting not found.');
  await requireManager(req, meeting);
  const members = await activeMembersFor(meeting);
  const records = await AttendanceRecord.find({ meetingId: meeting._id, userId: { $in: members.map((user) => user._id) } }).populate('userId', 'firstName lastName email').sort({ status: 1 }).lean();
  return res.json({ success: true, data: { meeting, records, summary: summarize(records) } });
};
