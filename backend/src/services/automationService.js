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
import { getBirthdaySettings, getBirthdayClockParts, runBirthdayBatch } from './birthdayService.js';

const QUEUE_NAME = 'club-automation';
let queue; let worker; let redis; let schedules = []; let started = false; let serviceState = 'stopped';
let schedulerMode = 'fallback'; let schedulerReason = '';
let redisWarningLogged = false; let birthdayFailureLogged = false;
let runBirthdayTick = async () => {};
let birthdayFallbackCron;

const ensureBirthdayFallbackSchedule = () => {
  birthdayFallbackCron ??= cron.schedule('* * * * *', () => runBirthdayTick(), { timezone: 'UTC' });
};

const notifyMany = async (users, payload) => Promise.all(users.map((user) => createNotification({ recipient: user._id || user, ...payload, dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:${user._id || user}` : undefined })));
const enabledSetting = async (key) => (await SystemSetting.findOne({ key }).select('value').lean())?.value !== false;
const sendMemberEmail = async (user, template, subject, text, idempotencyKey) => {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password || !env.smtp.from) return;
  try { await sendTrackedEmail({ to: user.email, template, subject, text, idempotencyKey }); }
  catch { /* Delivery is tracked and will be retried by the queue. */ throw new Error('Email delivery failed; the job will retry.'); }
};

const runDailyAutomation = async () => {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const profiles = await MemberProfile.find({ isActiveInClub: true }).select('userId notificationPreferences').lean();
  const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('firstName lastName email').lean();
  const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
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
  if (job.name === 'birthday-tick') return runBirthdayTick();
  throw new Error(`Unsupported automation job: ${job.name}`);
};

export const enqueueEmailDelivery = async (email) => {
  if (started && queue && redis?.status === 'ready') {
    try { return await queue.add('email-delivery', email, { jobId: email.idempotencyKey }); }
    catch (error) {
      schedulerMode = 'fallback'; schedulerReason = 'Redis queue is unavailable; email delivery is running directly.';
      globalThis.birthdaySchedulerMode = schedulerMode; globalThis.birthdaySchedulerReason = schedulerReason;
      logger.warn('Email queue unavailable; delivering directly', { errorName: error.name, errorMessage: error.message });
    }
  }
  return sendTrackedEmail(email);
};

export const startAutomationService = async () => {
  if (started) return { enabled: true, close: closeAutomationService };
  serviceState = 'starting';
  if (env.redisUrl) {
    try {
      redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: null, enableReadyCheck: true, retryStrategy: (attempt) => Math.min(attempt * 1000, 5000), ...(env.redisUrl.startsWith('rediss://') ? { tls: {} } : {}) });
      redis.on('error', (error) => {
        schedulerMode = 'fallback'; schedulerReason = 'Redis is unavailable; using the database-locked in-process scheduler.';
        globalThis.birthdaySchedulerMode = schedulerMode;
        globalThis.birthdaySchedulerReason = schedulerReason;
        ensureBirthdayFallbackSchedule();
        if (!redisWarningLogged) { redisWarningLogged = true; logger.warn('Redis unavailable; background jobs are using fallback scheduling', { errorName: error.name, errorMessage: error.message }); }
      });
      await Promise.race([redis.connect().then(() => redis.ping()), new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timed out.')), 4000))]);
      queue = new Queue(QUEUE_NAME, { connection: redis, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: { age: 7 * 24 * 60 * 60 }, removeOnFail: { age: 30 * 24 * 60 * 60 } } });
      worker = new Worker(QUEUE_NAME, processJob, { connection: redis.duplicate(), concurrency: 2 });
      const markRedisUnavailable = (error) => {
        schedulerMode = 'fallback'; schedulerReason = 'Redis is unavailable; using the database-locked in-process scheduler.';
        globalThis.birthdaySchedulerMode = schedulerMode; globalThis.birthdaySchedulerReason = schedulerReason;
        ensureBirthdayFallbackSchedule();
        if (!redisWarningLogged) { redisWarningLogged = true; logger.warn('Redis unavailable; background jobs are using fallback scheduling', { errorName: error.name, errorMessage: error.message }); }
      };
      queue.on('error', markRedisUnavailable);
      worker.on('error', markRedisUnavailable);
      worker.on('failed', (job, error) => logger.error('Automation job failed', { jobName: job?.name, jobId: job?.id, errorMessage: error.message }));
      schedulerMode = 'redis';
    } catch (error) {
      schedulerMode = 'fallback'; schedulerReason = `Redis unavailable: ${error.message}`;
      if (!redisWarningLogged) { redisWarningLogged = true; logger.warn('Redis unavailable; background jobs are using fallback scheduling', { errorName: error.name, errorMessage: error.message }); }
      await worker?.close().catch(() => {}); await queue?.close().catch(() => {});
      if (redis && redis.status !== 'end') redis.disconnect(false);
      worker = undefined; queue = undefined; redis = undefined;
    }
  } else {
    schedulerMode = 'fallback'; schedulerReason = 'REDIS_URL is not configured; using the database-locked in-process scheduler.';
    if (!redisWarningLogged) { redisWarningLogged = true; logger.warn('REDIS_URL is not configured; background jobs are using fallback scheduling'); }
  }
  globalThis.birthdaySchedulerMode = schedulerMode;
  globalThis.birthdaySchedulerReason = schedulerReason;

  const localDateKey = async () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  };
  const enqueueOrRun = async (name) => {
    const key = await localDateKey();
    const data = name === 'weekly-report' ? { weekKey: key } : { dateKey: key };
    if (queue && redis?.status === 'ready') {
      try { await queue.add(name, data, { jobId: `${name}:${key}` }); return; }
      catch {
        schedulerMode = 'fallback'; schedulerReason = 'Redis queue is unavailable; using the database-locked in-process scheduler.';
        globalThis.birthdaySchedulerMode = schedulerMode; globalThis.birthdaySchedulerReason = schedulerReason;
      }
    }
    if (name === 'daily-automation') await runDailyAutomation(data);
    else await runWeeklyReport(data);
  };
  runBirthdayTick = async () => {
    try {
      const settings = await getBirthdaySettings();
      if (!settings.enabled) return;
      const now = await getBirthdayClockParts(settings.timezone);
      const [hour, minute] = settings.sendTime.split(':').map(Number);
      if (now.hour * 60 + now.minute < hour * 60 + minute) return;
      await runBirthdayBatch({ triggeredBy: 'scheduler', schedulerMode });
      birthdayFailureLogged = false;
    } catch (error) {
      if (!birthdayFailureLogged) {
        birthdayFailureLogged = true;
        logger.error('Birthday automation run failed; further identical scheduler errors are suppressed until a successful run.', { errorName: error.name, errorMessage: error.message });
      }
    }
  };

  const dateKey = await localDateKey();
  schedules = [
    cron.schedule('0 9 * * *', () => enqueueOrRun('daily-automation'), { timezone: 'Asia/Kolkata' }),
    cron.schedule('0 9 * * 1', () => enqueueOrRun('weekly-report'), { timezone: 'Asia/Kolkata' }),
  ];
  if (queue && redis?.status === 'ready') {
    try {
      await queue.upsertJobScheduler('birthday-minute-tick', { every: 60_000 }, { name: 'birthday-tick', data: {} });
    } catch (error) {
      schedulerMode = 'fallback'; schedulerReason = 'Redis scheduling is unavailable; using the database-locked in-process scheduler.';
      globalThis.birthdaySchedulerMode = schedulerMode; globalThis.birthdaySchedulerReason = schedulerReason;
      ensureBirthdayFallbackSchedule();
      if (!redisWarningLogged) { redisWarningLogged = true; logger.warn('Redis scheduler unavailable; using fallback scheduling', { errorName: error.name, errorMessage: error.message }); }
    }
  } else {
    ensureBirthdayFallbackSchedule();
  }
  // Keep a local, database-lock-protected clock active even when Redis is
  // healthy. The Redis repeatable job remains useful, but relying on its
  // scheduler alone can miss a birthday run after a send-time change or a
  // delayed repeatable job. Both clocks are safe because runBirthdayBatch
  // acquires the same MongoDB lock for a given local date.
  ensureBirthdayFallbackSchedule();
  if (queue && redis?.status === 'ready') {
    await queue.add('daily-automation', { dateKey }, { jobId: `daily-automation:${dateKey}` }).catch(async (error) => {
      try { await runDailyAutomation({ dateKey }); }
      catch (fallbackError) { logger.error('Daily automation could not be queued or run', { errorName: fallbackError.name, errorMessage: fallbackError.message, queueError: error.message }); }
    });
    if (new Date().getDay() === 1) await queue.add('weekly-report', { weekKey: dateKey }, { jobId: `weekly-report:${dateKey}` }).catch(async (error) => {
      try { await runWeeklyReport({ weekKey: dateKey }); }
      catch (fallbackError) { logger.error('Weekly report could not be queued or run', { errorName: fallbackError.name, errorMessage: fallbackError.message, queueError: error.message }); }
    });
  }
  started = true; serviceState = 'ready';
  await runBirthdayTick();
  logger.info('Background automation enabled', { mode: schedulerMode, timezone: 'Asia/Kolkata' });
  return { enabled: true, mode: schedulerMode, close: closeAutomationService };
};

export const closeAutomationService = async () => {
  for (const schedule of schedules) schedule.stop();
  schedules = [];
  birthdayFallbackCron?.stop(); birthdayFallbackCron = undefined;
  await worker?.close(); await queue?.close();
  if (redis && redis.status !== 'end') redis.disconnect(false);
  worker = undefined; queue = undefined; redis = undefined; started = false;
  serviceState = 'stopped';
};

export const getAutomationHealth = () => ({ enabled: started, status: serviceState, timezone: 'Asia/Kolkata', birthdayMode: schedulerMode, birthdayFallbackReason: schedulerReason });
