import { timingSafeEqual } from 'node:crypto';
import { matchedData } from 'express-validator';
import { BirthdaySettings } from '../models/BirthdaySettings.js';
import { BirthdayLog } from '../models/BirthdayLog.js';
import { User } from '../models/User.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { env } from '../config/env.js';
import { recordAudit } from '../services/auditService.js';
import { sendTrackedEmail } from '../services/notificationService.js';
import {
  getBirthdaySettings, getBirthdayStatus, getUpcomingBirthdays, listBirthdayLogs,
  renderBirthdayTemplate, runBirthdayBatch, sendBirthdayTest, getBirthdayClockParts, getBirthdayTodayKey,
} from '../services/birthdayService.js';

const forbidden = () => Object.assign(new Error('Your role does not allow this birthday automation action.'), { statusCode: 403, code: 'FORBIDDEN' });
const respond = (res, data) => res.json({ success: true, data });
const scheduler = () => ({ mode: globalThis.birthdaySchedulerMode || (env.redisUrl ? 'redis' : 'fallback'), reason: globalThis.birthdaySchedulerReason || '' });

export const readBirthdaySettings = async (_req, res) => respond(res, await getBirthdaySettings());

export const saveBirthdaySettings = async (req, res) => {
  if (req.auth.role !== 'super_admin' && !req.auth.roles.includes('super_admin')) throw forbidden();
  const fields = matchedData(req, { locations: ['body'] });
  if (fields.timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: fields.timezone }); }
    catch { throw Object.assign(new Error('Choose a valid timezone.'), { statusCode: 400, code: 'VALIDATION_ERROR' }); }
  }
  const prior = await getBirthdaySettings();
  const settings = await BirthdaySettings.findOneAndUpdate({ key: 'default' }, { $set: { ...fields, key: 'default', updatedBy: req.auth.userId } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  await recordAudit(req, { action: fields.enabled !== undefined && fields.enabled !== prior.enabled ? (fields.enabled ? 'birthday.enable' : 'birthday.disable') : 'birthday.settings.update', resourceType: 'BirthdaySettings', resourceId: settings._id, metadata: { enabled: settings.enabled, sendTime: settings.sendTime, timezone: settings.timezone } });
  return respond(res, settings);
};

export const birthdayStatus = async (_req, res) => {
  const mode = scheduler();
  return respond(res, await getBirthdayStatus(mode.mode, mode.reason));
};

export const upcomingBirthdays = async (req, res) => {
  const days = Number(req.query.days || 30);
  let domainIds;
  let groupIds;
  const globalAdmin = req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role));
  if (!globalAdmin) {
    const isDomainAdmin = req.auth.roles.includes('domain_admin');
    const ledGroups = await GroupMembership.find({ userId: req.auth.userId, role: 'lead' }).distinct('groupId');
    if (!isDomainAdmin && !ledGroups.length) throw forbidden();
    if (isDomainAdmin) domainIds = req.auth.domainIds || [];
    groupIds = ledGroups;
  }
  const result = await getUpcomingBirthdays({ days, domainIds, groupIds, leadUserId: groupIds ? req.auth.userId : undefined });
  if (!globalAdmin) result.items = result.items.map(({ id, name, avatar, domain, month, day, date, daysLeft }) => ({ id, name, avatar, domain, month, day, date, daysLeft }));
  return respond(res, result);
};

export const birthdayLogs = async (req, res) => respond(res, await listBirthdayLogs({
  page: Number(req.query.page || 1), limit: Number(req.query.limit || 25), status: req.query.status || undefined,
  from: req.query.from || undefined, to: req.query.to || undefined, q: req.query.q || undefined,
}));

export const birthdayPreview = async (req, res) => {
  const settings = { ...await getBirthdaySettings(), ...req.body };
  const sample = { firstName: 'Aman', lastName: 'Verma' };
  const rendered = renderBirthdayTemplate(settings, sample, 'Creative Arts');
  return respond(res, rendered);
};

export const birthdayTest = async (req, res) => respond(res, await sendBirthdayTest(req.user, req));

export const birthdayRunNow = async (req, res) => {
  const result = await runBirthdayBatch({ triggeredBy: 'manual', schedulerMode: scheduler().mode, actorUserId: req.auth.userId });
  await recordAudit(req, { action: 'birthday.run_now', resourceType: 'BirthdayAutomation', metadata: result });
  return respond(res, result);
};

export const birthdayRunDue = async (req, res) => {
  if (!env.cronSecret) throw Object.assign(new Error('External birthday trigger is not configured.'), { statusCode: 503, code: 'CRON_NOT_CONFIGURED' });
  const provided = String(req.get('x-cron-secret') || '');
  const expectedBuffer = Buffer.from(env.cronSecret);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) throw Object.assign(new Error('A valid cron secret is required.'), { statusCode: 401, code: 'CRON_SECRET_REQUIRED' });
  const settings = await getBirthdaySettings();
  if (!settings.enabled) return respond(res, { status: 'disabled' });
  const now = await getBirthdayClockParts(settings.timezone);
  const [hour, minute] = settings.sendTime.split(':').map(Number);
  if (now.hour * 60 + now.minute < hour * 60 + minute) return respond(res, { status: 'not_due', sendTime: settings.sendTime, timezone: settings.timezone });
  return respond(res, await runBirthdayBatch({ triggeredBy: 'scheduler', schedulerMode: scheduler().mode }));
};

export const resendBirthdayLog = async (req, res) => {
  const log = await BirthdayLog.findById(req.params.logId);
  if (!log) throw Object.assign(new Error('Birthday log was not found.'), { statusCode: 404, code: 'BIRTHDAY_LOG_NOT_FOUND' });
  if (log.status !== 'failed') throw Object.assign(new Error('Only failed birthday emails can be resent.'), { statusCode: 409, code: 'BIRTHDAY_LOG_NOT_FAILED' });
  if (!req.auth.roles.includes('super_admin')) throw forbidden();
  const user = await User.findById(log.userId).select('firstName lastName email dateOfBirth birthdayEmailOptOut isActive profilePhoto');
  if (!user || !user.isActive || user.birthdayEmailOptOut || !user.email) throw Object.assign(new Error('This member is no longer eligible to receive birthday email.'), { statusCode: 409, code: 'BIRTHDAY_RECIPIENT_INELIGIBLE' });
  const todayKey = await getBirthdayTodayKey();
  const sentToday = await BirthdayLog.countDocuments({ date: todayKey, status: 'sent', triggeredBy: { $in: ['scheduler', 'manual'] } });
  if (sentToday >= env.birthdayDailyCap) throw Object.assign(new Error('The configured birthday email cap has been reached for today.'), { statusCode: 429, code: 'BIRTHDAY_DAILY_CAP_REACHED' });
  const settings = await getBirthdaySettings();
  const rendered = renderBirthdayTemplate(settings, user, 'The Impeccables');
  try {
    const result = await sendTrackedEmail({ to: user.email, ...rendered, template: 'birthday', idempotencyKey: `birthday:${log.date}:${user._id}` });
    log.status = 'sent'; log.reason = ''; log.error = ''; log.sentAt = new Date(); log.providerMessageId = result.messageId || ''; await log.save();
    await recordAudit(req, { action: 'birthday.resend', resourceType: 'BirthdayLog', resourceId: log._id, metadata: { date: log.date } });
    return respond(res, log);
  } catch (error) {
    log.error = String(error.message || error).slice(0, 1000); await log.save(); throw error;
  }
};

