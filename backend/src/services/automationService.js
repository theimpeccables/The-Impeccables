import cron from 'node-cron';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { Domain } from '../models/Domain.js';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { Event } from '../models/Event.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Report } from '../models/Report.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { Role } from '../models/Role.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendTrackedEmail } from './notificationService.js';
import { createNotification } from './notificationService.js';

const QUEUE_NAME = 'club-automation';
let queue; let worker; let redis; let schedules = []; let started = false; let serviceState = env.redisUrl ? 'stopped' : 'disabled';

const notifyMany = async (users, payload) => Promise.all(users.map((user) => createNotification({ recipient: user._id || user, ...payload, dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:${user._id || user}` : undefined })));
const enabledSetting = async (key) => (await SystemSetting.findOne({ key }).select('value').lean())?.value !== false;
const sendMemberEmail = async (user, template, subject, text, idempotencyKey) => {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password || !env.smtp.from) return;
  try { await sendTrackedEmail({ to: user.email, template, subject, text, idempotencyKey }); }
  catch { /* Delivery is tracked and will be retried by the queue. */ throw new Error('Email delivery failed; the job will retry.'); }
};

const runDailyAutomation = async ({ dateKey }) => {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const profiles = await MemberProfile.find({ isActiveInClub: true }).select('userId notificationPreferences').lean();
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('firstName lastName email dateOfBirth').lean();
  const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const birthdayUsers = await enabledSetting('automation.birthdays.enabled') ? users.filter((user) => user.dateOfBirth && new Date(user.dateOfBirth).getMonth() === now.getMonth() && new Date(user.dateOfBirth).getDate() === now.getDate()) : [];
  for (const birthdayUser of birthdayUsers) {
    const recipients = users.filter((user) => user._id !== birthdayUser._id);
    await notifyMany(recipients, { type: 'system', title: 'Today is a club birthday', message: `${birthdayUser.firstName} ${birthdayUser.lastName} is celebrating a birthday today.`, dedupeKey: `birthday:${dateKey}:${birthdayUser._id}` });
    for (const recipient of recipients) {
      if (profileByUser.get(String(recipient._id))?.notificationPreferences?.emailBirthday) await sendMemberEmail(recipient, 'birthday', 'Birthday wishes from The Impeccables', `Today is ${birthdayUser.firstName} ${birthdayUser.lastName}'s birthday. Send them your wishes!`, `birthday:${dateKey}:${recipient._id}:${birthdayUser._id}`);
    }
  }
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await enabledSetting('automation.eventReminders.enabled') ? await Event.find({ isPublished: true, date: { $gte: now, $lte: tomorrow } }).select('title date venue slug').lean() : [];
  for (const event of events) {
    await notifyMany(users, { type: 'event', title: 'Event reminder', message: `${event.title} is coming up${event.venue ? ` at ${event.venue}` : ''}.`, href: `/events/${event.slug}`, relatedModel: 'Event', relatedId: event._id, dedupeKey: `event-reminder:${event._id}` });
    for (const recipient of users) if (profileByUser.get(String(recipient._id))?.notificationPreferences?.emailTasks) await sendMemberEmail(recipient, 'event-reminder', `Coming up: ${event.title}`, `${event.title} is scheduled for ${new Date(event.date).toLocaleString()}${event.venue ? ` at ${event.venue}` : ''}.`, `event-reminder:${event._id}:${recipient._id}`);
  }
  const stale = await ApprovalRequest.find({ status: 'pending', submittedAt: { $lte: new Date(now.getTime() - 72 * 60 * 60 * 1000) } }).select('domain postId submittedAt').lean();
  for (const approval of stale) {
    const domain = await Domain.findById(approval.domain).select('name').lean();
    const assigned = await DomainAdmin.find({ domainId: approval.domain, isActive: true }).distinct('userId');
    await notifyMany(assigned, { type: 'approval', title: 'Stale approval needs attention', message: `A ${domain?.name || ''} submission has been waiting for over 72 hours.`, href: '/dashboard/approvals', relatedModel: 'ApprovalRequest', relatedId: approval._id, dedupeKey: `stale-approval:${approval._id}` });
  }
};

const runWeeklyReport = async ({ weekKey }) => {
  if (!(await enabledSetting('automation.weeklyReports.enabled'))) return null;
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 7);
  const [members, posts, tasks, events] = await Promise.all([
    User.countDocuments({ isActive: true }),
    (await import('../models/Post.js')).Post.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Task.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Event.countDocuments({ isPublished: true, date: { $gte: start, $lte: end } }),
  ]);
  const report = await Report.findOneAndUpdate({ type: 'weekly', periodStart: start, periodEnd: end }, { $set: { data: { members, posts, tasks, events } } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const adminRole = await Role.findOne({ name: 'admin' }).select('_id');
  const adminIds = adminRole ? await UserRole.find({ roleId: adminRole._id }).distinct('userId') : [];
  const admins = await User.find({ _id: { $in: adminIds }, isActive: true }).select('email').lean();
  for (const admin of admins) await sendMemberEmail(admin, 'weekly-report', 'The Impeccables weekly report', `Weekly summary: ${members} active members, ${posts} submissions, ${tasks} tasks, ${events} events.`, `weekly-report:${weekKey}:${admin._id}`);
  return report;
};

const processJob = async (job) => {
  if (job.name === 'daily-automation') return runDailyAutomation(job.data);
  if (job.name === 'weekly-report') return runWeeklyReport(job.data);
  if (job.name === 'email-delivery') return sendTrackedEmail(job.data);
  throw new Error(`Unsupported automation job: ${job.name}`);
};

export const enqueueEmailDelivery = async (email) => {
  if (started && queue) return queue.add('email-delivery', email, { jobId: email.idempotencyKey });
  return sendTrackedEmail(email);
};

export const startAutomationService = async () => {
  if (started || !env.redisUrl) return { enabled: false, close: async () => {} };
  serviceState = 'starting';
  try {
  redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
  queue = new Queue(QUEUE_NAME, { connection: redis, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: { age: 7 * 24 * 60 * 60 }, removeOnFail: { age: 30 * 24 * 60 * 60 } } });
  worker = new Worker(QUEUE_NAME, processJob, { connection: redis.duplicate(), concurrency: 2 });
  worker.on('failed', (job, error) => logger.error('Automation job failed', { jobName: job?.name, jobId: job?.id, errorMessage: error.message }));
  schedules = [
    cron.schedule('0 9 * * *', () => queue.add('daily-automation', { dateKey: new Date().toISOString().slice(0, 10) }, { jobId: `daily:${new Date().toISOString().slice(0, 10)}` }), { timezone: 'Asia/Kolkata' }),
    cron.schedule('0 9 * * 1', () => queue.add('weekly-report', { weekKey: new Date().toISOString().slice(0, 10) }, { jobId: `weekly:${new Date().toISOString().slice(0, 10)}` }), { timezone: 'Asia/Kolkata' }),
  ];
  const dateKey = new Date().toISOString().slice(0, 10);
  await queue.add('daily-automation', { dateKey }, { jobId: `daily:${dateKey}` });
  if (new Date().getDay() === 1) await queue.add('weekly-report', { weekKey: dateKey }, { jobId: `weekly:${dateKey}` });
  started = true;
  serviceState = 'ready';
  logger.info('Background automation enabled', { timezone: 'Asia/Kolkata' });
  return { enabled: true, close: closeAutomationService };
  } catch (error) {
    serviceState = 'failed';
    await closeAutomationService().catch(() => {});
    serviceState = 'failed';
    throw error;
  }
};

export const closeAutomationService = async () => {
  for (const schedule of schedules) schedule.stop();
  schedules = [];
  await worker?.close(); await queue?.close();
  if (redis && redis.status !== 'end') await redis.quit();
  worker = undefined; queue = undefined; redis = undefined; started = false;
  serviceState = env.redisUrl ? 'stopped' : 'disabled';
};

export const getAutomationHealth = () => ({ enabled: Boolean(env.redisUrl), status: serviceState, timezone: 'Asia/Kolkata' });
