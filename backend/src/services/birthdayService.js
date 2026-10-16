import { randomUUID } from 'node:crypto';
import { BirthdaySettings } from '../models/BirthdaySettings.js';
import { BirthdayLog } from '../models/BirthdayLog.js';
import { BirthdayRunLock } from '../models/BirthdayRunLock.js';
import { User } from '../models/User.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Role } from '../models/Role.js';
import { UserRole } from '../models/UserRole.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { createNotification, sendTrackedEmail } from './notificationService.js';
import { recordAudit } from './auditService.js';
import { env } from '../config/env.js';

const CLUB_NAME = 'The Impeccables';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (parts) => `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
const zonedParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
};
const zonedClockParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
};
const zonedDateTimeToUtc = (parts, timezone) => {
  const wanted = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0);
  let guess = wanted;
  for (let i = 0; i < 3; i += 1) {
    const shown = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess));
    const values = Object.fromEntries(shown.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
    const actual = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
    guess += wanted - actual;
  }
  return new Date(guess);
};
const datePartsForUser = (dob) => {
  if (!dob) return null;
  const date = new Date(dob);
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};
const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const birthdayMatches = (dob, today) => {
  const parts = datePartsForUser(dob);
  if (!parts) return false;
  if (parts.month === 2 && parts.day === 29 && !isLeapYear(today.year)) return today.month === 2 && today.day === 28;
  return parts.month === today.month && parts.day === today.day;
};
const defaultSettings = () => ({
  enabled: false, sendTime: '09:00', timezone: 'Asia/Kolkata',
  subject: 'Happy birthday, {{firstName}}! 🎂',
  bodyHtml: '<div style="font-family:Arial,sans-serif;background:#08080a;color:#fff;padding:32px;border-radius:16px"><div style="border-left:4px solid #ff2a2a;padding:4px 0 4px 20px"><img src="{{logoUrl}}" alt="The Impeccables" width="120" style="display:block;margin-bottom:20px"><p style="color:#ff5555;letter-spacing:.18em;text-transform:uppercase">The Impeccables</p><h1>Happy Birthday, {{firstName}}!</h1><p>Wishing you a year filled with creativity, good people, and moments worth celebrating.</p><p>Keep creating, collaborating, and celebrating. We are glad you are part of {{clubName}}.</p><p style="color:#aaa;font-size:12px">{{year}} · {{domain}}</p></div></div>',
  bodyText: 'Happy birthday, {{firstName}}! Wishing you a year filled with creativity, good people, and moments worth celebrating. We are glad you are part of {{clubName}}.',
  templateVariables: ['firstName', 'fullName', 'domain', 'clubName', 'year'], includeClubSignature: true, ccAdmins: false, notifyInApp: false,
});

export const getBirthdaySettings = async () => {
  const existing = await BirthdaySettings.findOne({ key: 'default' }).lean();
  return { ...defaultSettings(), ...(existing || {}), _id: existing?._id || null, updatedAt: existing?.updatedAt || null, updatedBy: existing?.updatedBy || null };
};

export const renderBirthdayTemplate = (settings, user, domainName = 'The Impeccables') => {
  const values = {
    firstName: user?.firstName || 'Aman',
    fullName: `${user?.firstName || 'Aman'} ${user?.lastName || 'Verma'}`.trim(),
    domain: domainName || 'The Impeccables',
    clubName: CLUB_NAME,
    year: String(new Date().getFullYear()),
    logoUrl: `${env.frontendUrl.replace(/\/$/, '')}/impeccables-logo.png`,
  };
  const render = (template, html = false) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, html ? escapeHtml(value) : value), String(template || ''));
  const signature = settings.includeClubSignature ? `<p style="color:#aaa">With warm wishes,<br><strong>${CLUB_NAME}</strong></p>` : '';
  const optOutUrl = `${env.frontendUrl.replace(/\/$/, '')}/dashboard/settings`;
  const optOut = `<p style="color:#888;font-size:12px">To stop birthday emails, <a href="${escapeHtml(optOutUrl)}" style="color:#ff5555">update your birthday preferences in profile settings</a>.</p>`;
  return {
    subject: render(settings.subject || defaultSettings().subject),
    html: `${render(settings.bodyHtml || defaultSettings().bodyHtml, true)}${signature}${optOut}`,
    text: `${render(settings.bodyText || defaultSettings().bodyText)}${settings.includeClubSignature ? `\n\nWith warm wishes,\n${CLUB_NAME}` : ''}\n\nTo stop birthday emails, update your birthday preferences in profile settings: ${optOutUrl}`,
  };
};

const profileScope = async ({ domainIds, groupIds, leadUserId }) => {
  const ownGroups = leadUserId ? await GroupMembership.find({ userId: leadUserId, role: 'lead' }).distinct('groupId') : [];
  const allowedGroups = [...new Set([...ownGroups.map(String), ...(groupIds || []).map(String)])];
  if (!domainIds?.length && !allowedGroups.length) return [];
  const [domainMembers, groupMembers] = await Promise.all([
    domainIds?.length ? MemberProfile.find({ domains: { $in: domainIds } }).distinct('userId') : [],
    allowedGroups.length ? GroupMembership.find({ groupId: { $in: allowedGroups } }).distinct('userId') : [],
  ]);
  return [...new Set([...domainMembers, ...groupMembers].map(String))];
};

const loadBirthdayMembers = async ({ domainIds, groupIds, leadUserId, includeInactive = false } = {}) => {
  const scoped = domainIds !== undefined || groupIds !== undefined || leadUserId !== undefined;
  const scopeIds = scoped ? await profileScope({ domainIds, groupIds, leadUserId }) : null;
  const userFilter = scoped ? { _id: { $in: scopeIds }, ...(includeInactive ? {} : { isActive: true }) } : { ...(includeInactive ? {} : { isActive: true }) };
  const users = await User.find(userFilter)
    .select('firstName lastName email profilePhoto dateOfBirth birthdayEmailOptOut showBirthdayToClub isActive').lean();
  const profiles = await MemberProfile.find({ userId: { $in: users.map((user) => user._id) } }).select('userId domains groups isActiveInClub').populate('domains', 'name').lean();
  const profileById = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  return users.filter((user) => includeInactive || profileById.get(String(user._id))?.isActiveInClub !== false)
    .map((user) => ({ ...user, profile: profileById.get(String(user._id)), domainName: profileById.get(String(user._id))?.domains?.[0]?.name || 'The Impeccables' }));
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const writeOutcome = async (user, todayKey, triggeredBy, fields) => {
  if (triggeredBy === 'scheduler') {
    return BirthdayLog.findOneAndUpdate({ userId: user._id, date: todayKey, triggeredBy }, { $set: { email: user.email || '', ...fields } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  return BirthdayLog.create({ userId: user._id, email: user.email || '', date: todayKey, triggeredBy, ...fields });
};

const mailAdmins = async (excludeUserId) => {
  const adminRole = await Role.findOne({ name: 'admin' }).select('_id').lean();
  const superRole = await Role.findOne({ name: 'super_admin' }).select('_id').lean();
  if (!adminRole && !superRole) return [];
  const roleIds = [adminRole?._id, superRole?._id].filter(Boolean);
  const ids = await UserRole.find({ roleId: { $in: roleIds } }).distinct('userId');
  return User.find({ _id: { $in: ids, ...(excludeUserId ? { $ne: excludeUserId } : {}) }, isActive: true }).select('email').lean();
};

const runLock = async (key, task) => {
  const owner = randomUUID();
  const now = new Date();
  let lock;
  try {
    lock = await BirthdayRunLock.findOneAndUpdate(
      { _id: key, expiresAt: { $lte: now } },
      { $set: { owner, state: 'running', expiresAt: new Date(now.getTime() + 15 * 60_000) } },
      { new: true },
    );
    if (!lock) lock = await BirthdayRunLock.create({ _id: key, owner, state: 'running', expiresAt: new Date(now.getTime() + 15 * 60_000) });
  } catch (error) {
    if (error.code === 11000) return { acquired: false, reason: 'Already running or completed.' };
    throw error;
  }
  try {
    const result = await task();
    await BirthdayRunLock.updateOne({ _id: key, owner }, { $set: { state: 'completed', result, expiresAt: new Date(now.getTime() + 36 * 60 * 60_000) } });
    return { acquired: true, ...result };
  } catch (error) {
    await BirthdayRunLock.deleteOne({ _id: key, owner });
    throw error;
  }
};

const deliverOne = async (member, settings, date, triggeredBy, { retryFailed = true, actorUserId } = {}) => {
  const todayKey = dateKey(date);
  if (!member.isActive || member.profile?.isActiveInClub === false) return writeOutcome(member, todayKey, triggeredBy, { status: 'skipped', reason: 'deactivated account', error: '' });
  if (member.birthdayEmailOptOut) return writeOutcome(member, todayKey, triggeredBy, { status: 'skipped', reason: 'opted out', error: '' });
  if (!isValidEmail(member.email)) return writeOutcome(member, todayKey, triggeredBy, { status: 'skipped', reason: 'no valid email', error: '' });
  if (triggeredBy !== 'test') {
    const previouslySent = await BirthdayLog.exists({ userId: member._id, date: todayKey, status: 'sent', triggeredBy: { $in: ['scheduler', 'manual'] } });
    if (previouslySent) return { status: 'skipped', reason: 'already sent' };
  }
  const existing = triggeredBy === 'scheduler' ? await BirthdayLog.findOne({ userId: member._id, date: todayKey, triggeredBy }).lean() : null;
  if (existing?.status === 'sent') return { status: 'skipped', reason: 'already sent' };
  if (existing?.status === 'skipped') return existing;
  if (existing?.status === 'failed' && !retryFailed) return existing;
  if (triggeredBy === 'scheduler' && !existing) await writeOutcome(member, todayKey, triggeredBy, { status: 'queued', reason: '', error: '' });
  const mail = renderBirthdayTemplate(settings, member, member.domainName);
  const cc = settings.ccAdmins ? [...new Set((await mailAdmins(actorUserId)).map(({ email }) => email.toLowerCase()).filter(isValidEmail))] : [];
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await sendTrackedEmail({ to: member.email, cc, ...mail, template: 'birthday', idempotencyKey: `birthday:${todayKey}:${member._id}` });
      if (settings.notifyInApp && triggeredBy !== 'test') await createNotification({ recipient: member._id, type: 'system', title: 'Happy birthday!', message: `Wishing you a wonderful birthday, ${member.firstName}.`, dedupeKey: `birthday-greeting:${todayKey}:${member._id}` }).catch(() => {});
      return writeOutcome(member, todayKey, triggeredBy, { status: 'sent', reason: '', error: '', providerMessageId: result.messageId || '', sentAt: new Date() });
    } catch (error) {
      lastError = error;
      if (attempt < 2) await delay([1000, 3000][attempt]);
    }
  }
  return writeOutcome(member, todayKey, triggeredBy, { status: 'failed', reason: 'delivery failed', error: String(lastError?.message || lastError || 'Email delivery failed').slice(0, 1000) });
};

export const runBirthdayBatch = async ({ triggeredBy = 'scheduler', now = new Date(), schedulerMode = 'fallback', actorUserId } = {}) => {
  const settings = await getBirthdaySettings();
  const today = zonedParts(now, settings.timezone);
  const todayKey = dateKey(today);
  const key = `birthday:${triggeredBy}:${todayKey}`;
  if (triggeredBy === 'scheduler' && !settings.enabled) return { date: todayKey, mode: schedulerMode, status: 'disabled', sent: 0, failed: 0, skipped: 0 };
  return runLock(key, async () => {
    const members = (await loadBirthdayMembers({ includeInactive: true })).filter((member) => birthdayMatches(member.dateOfBirth, today));
    const sentSoFar = await BirthdayLog.countDocuments({ date: todayKey, status: 'sent', triggeredBy: { $in: ['scheduler', 'manual'] } });
    const room = Math.max(0, env.birthdayDailyCap - sentSoFar);
    let sent = 0; let failed = 0; let skipped = 0; let attempted = 0;
    for (const member of members) {
      const priorSent = await BirthdayLog.exists({ userId: member._id, date: todayKey, status: 'sent', triggeredBy: { $in: ['scheduler', 'manual'] } });
      if (priorSent && triggeredBy !== 'test') {
        skipped += 1;
        if (triggeredBy === 'manual') await writeOutcome(member, todayKey, 'manual', { status: 'skipped', reason: 'already sent', error: '' });
        continue;
      }
      if (member.birthdayEmailOptOut || !isValidEmail(member.email) || !member.isActive || member.profile?.isActiveInClub === false) {
        const outcome = await deliverOne(member, settings, today, triggeredBy, { actorUserId });
        if (outcome.status === 'skipped') skipped += 1;
        continue;
      }
      if (triggeredBy !== 'test' && attempted >= room) {
        await writeOutcome(member, todayKey, triggeredBy === 'manual' ? 'manual' : 'scheduler', { status: 'queued', reason: 'daily send cap reached', error: '' });
        continue;
      }
      let outcome;
      try { outcome = await deliverOne(member, settings, today, triggeredBy, { actorUserId }); }
      catch (error) { outcome = await writeOutcome(member, todayKey, triggeredBy, { status: 'failed', reason: 'delivery failed', error: String(error.message || error).slice(0, 1000) }); }
      attempted += 1;
      if (outcome?.status === 'sent') sent += 1;
      else if (outcome?.status === 'failed') failed += 1;
      else if (outcome?.status === 'skipped') skipped += 1;
      await delay(250);
    }
    return { date: todayKey, mode: schedulerMode, status: 'completed', sent, failed, skipped, total: members.length };
  });
};

export const sendBirthdayTest = async (user, req) => {
  const settings = await getBirthdaySettings();
  const member = { ...user.toObject(), domainName: 'The Impeccables' };
  const today = zonedParts(new Date(), settings.timezone);
  const mail = renderBirthdayTemplate(settings, member, member.domainName);
  try {
    const result = await sendTrackedEmail({ to: member.email, ...mail, template: 'birthday-test', idempotencyKey: `birthday-test:${user._id}:${Date.now()}` });
    await BirthdayLog.create({ userId: user._id, email: user.email, date: dateKey(today), status: 'sent', triggeredBy: 'test', sentAt: new Date(), providerMessageId: result.messageId || '' });
    await recordAudit(req, { action: 'birthday.test', resourceType: 'BirthdayAutomation', metadata: { date: dateKey(today) } });
    return { status: 'sent', email: user.email };
  } catch (error) {
    await BirthdayLog.create({ userId: user._id, email: user.email, date: dateKey(today), status: 'failed', triggeredBy: 'test', reason: 'test delivery failed', error: String(error.message || error).slice(0, 1000) });
    throw error;
  }
};

export const getUpcomingBirthdays = async ({ days = 30, domainIds, groupIds, leadUserId } = {}) => {
  const settings = await getBirthdaySettings();
  const today = zonedParts(new Date(), settings.timezone);
  const users = await loadBirthdayMembers({ domainIds, groupIds, leadUserId });
  const upcoming = [];
  for (const user of users) {
    const dobParts = datePartsForUser(user.dateOfBirth);
    if (!dobParts) continue;
    for (let delta = 0; delta <= days; delta += 1) {
      const localDate = new Date(Date.UTC(today.year, today.month - 1, today.day + delta));
      const target = { year: localDate.getUTCFullYear(), month: localDate.getUTCMonth() + 1, day: localDate.getUTCDate() };
      if (birthdayMatches(user.dateOfBirth, target)) {
        upcoming.push({ id: user._id, name: `${user.firstName} ${user.lastName}`.trim(), avatar: user.profilePhoto || '', domain: user.domainName, month: target.month, day: target.day, date: dateKey(target), daysLeft: delta, optedOut: Boolean(user.birthdayEmailOptOut), hasEmail: isValidEmail(user.email) });
        break;
      }
    }
  }
  upcoming.sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name));
  const missingMembers = users.filter((user) => !user.dateOfBirth).map((user) => ({ id: user._id, name: `${user.firstName} ${user.lastName}`.trim(), avatar: user.profilePhoto || '', domain: user.domainName }));
  return { items: upcoming, missingDateCount: missingMembers.length, missingMembers };
};

export const getBirthdayStatus = async (mode, reason = '') => {
  const settings = await getBirthdaySettings();
  const today = zonedParts(new Date(), settings.timezone); const key = dateKey(today);
  const thisMonthPrefix = `${today.year}-${pad(today.month)}-`;
  const members = await loadBirthdayMembers();
  const todayTotal = members.filter((member) => birthdayMatches(member.dateOfBirth, today)).length;
  const eligibleToday = members.filter((member) => birthdayMatches(member.dateOfBirth, today) && !member.birthdayEmailOptOut && isValidEmail(member.email)).length;
  const monthTotal = members.filter((member) => datePartsForUser(member.dateOfBirth)?.month === today.month).length;
  const nonTest = { triggeredBy: { $ne: 'test' } };
  const [todaySent, todayFailed, todaySkipped, monthSent, last, lastRunLock] = await Promise.all([
    BirthdayLog.countDocuments({ date: key, status: 'sent', ...nonTest }), BirthdayLog.countDocuments({ date: key, status: 'failed', ...nonTest }),
    BirthdayLog.countDocuments({ date: key, status: 'skipped', ...nonTest }), BirthdayLog.countDocuments({ date: { $regex: `^${thisMonthPrefix}` }, status: 'sent', ...nonTest }),
    BirthdayLog.findOne({ date: key, ...nonTest }).sort({ updatedAt: -1 }).select('status reason error sentAt updatedAt').lean(),
    BirthdayRunLock.find({ _id: { $in: [`birthday:scheduler:${key}`, `birthday:manual:${key}`] } }).sort({ updatedAt: -1 }).limit(1).lean(),
  ]);
  const [hour, minute] = settings.sendTime.split(':').map(Number);
  let nextRun = settings.enabled ? zonedDateTimeToUtc({ ...today, hour, minute }, settings.timezone) : null;
  if (nextRun && nextRun <= new Date()) {
    const nextLocal = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
    nextRun = zonedDateTimeToUtc({ year: nextLocal.getUTCFullYear(), month: nextLocal.getUTCMonth() + 1, day: nextLocal.getUTCDate(), hour, minute }, settings.timezone);
  }
  return { enabled: settings.enabled, mode, fallbackReason: reason, timezone: settings.timezone, sendTime: settings.sendTime, nextRunAt: nextRun?.toISOString() || null, lastRun: lastRunLock[0]?.result || last || null, today: { birthdays: todayTotal, eligibleToEmail: eligibleToday, sent: todaySent, failed: todayFailed, skipped: todaySkipped }, thisMonth: { birthdays: monthTotal, sent: monthSent } };
};

export const listBirthdayLogs = async ({ page = 1, limit = 25, status, from, to, q } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (q) {
    const users = await User.find({ $or: [{ firstNameSearch: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { lastNameSearch: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { email: { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] }).distinct('_id');
    filter.userId = { $in: users };
  }
  const [items, total] = await Promise.all([BirthdayLog.find(filter).populate('userId', 'firstName lastName profilePhoto').sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), BirthdayLog.countDocuments(filter)]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getMissingBirthdayCount = async ({ domainIds } = {}) => {
  const members = await loadBirthdayMembers({ domainIds });
  return members.filter((member) => !member.dateOfBirth).length;
};

export const getBirthdayTodayKey = async () => dateKey(zonedParts(new Date(), (await getBirthdaySettings()).timezone));
export const getBirthdayTodayParts = async () => zonedParts(new Date(), (await getBirthdaySettings()).timezone);
export const getBirthdayClockParts = async (timezone) => zonedClockParts(new Date(), timezone || (await getBirthdaySettings()).timezone);
export const isBirthdayDateMatch = birthdayMatches;
export const birthdayDatePartsAtTimezone = zonedParts;
export const resolveLocalDateTime = zonedDateTimeToUtc;
