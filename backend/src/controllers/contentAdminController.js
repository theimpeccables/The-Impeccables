import { randomUUID } from 'node:crypto';
import { Achievement } from '../models/Achievement.js';
import { Announcement } from '../models/Announcement.js';
import { Domain } from '../models/Domain.js';
import { Event } from '../models/Event.js';
import { recordAudit } from '../services/auditService.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { User } from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { enqueueEmailDelivery } from '../services/automationService.js';

const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
const auditFields = (body) => Object.fromEntries(Object.entries(body).filter(([key]) => !/secret|password|token|credential/i.test(key)));

export const createEvent = async (req, res) => {
  const event = await Event.create({ ...req.body, slug: `${slugify(req.body.title)}-${randomUUID().slice(0, 6)}`, createdBy: req.auth.userId });
  await recordAudit(req, { action: 'event.create', resourceType: 'Event', resourceId: event._id, metadata: auditFields({ title: event.title, isPublished: event.isPublished }) });
  return res.status(201).json({ success: true, data: event });
};

export const listAdminEvents = async (_req, res) => res.json({ success: true, data: await Event.find().sort({ date: -1 }).limit(100).populate('domains', 'name').lean() });

export const updateEvent = async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!event) return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
  await recordAudit(req, { action: 'event.update', resourceType: 'Event', resourceId: event._id, metadata: auditFields(req.body) });
  return res.json({ success: true, data: event });
};

export const createAnnouncement = async (req, res) => {
  if (req.body.targetAudience === 'specific_domain' && !req.body.targetDomain) return res.status(400).json({ success: false, error: { code: 'DOMAIN_REQUIRED', message: 'Choose a domain for a domain-specific announcement.' } });
  const announcement = await Announcement.create({ ...req.body, sentBy: req.auth.userId, sentAt: req.body.isPublished ? new Date() : null });
  if (announcement.isPublished && announcement.channels.includes('in_app')) {
    const profileFilter = { isActiveInClub: true, 'notificationPreferences.inAppAll': true };
    if (announcement.targetAudience === 'specific_domain') profileFilter.domains = announcement.targetDomain;
    const profiles = await MemberProfile.find(profileFilter).select('userId').lean();
    const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('_id').lean();
    await Promise.all(users.map((user) => createNotification({ recipient: user._id, type: 'announcement', title: announcement.title, message: announcement.summary || announcement.content, href: '/announcements', relatedModel: 'Announcement', relatedId: announcement._id, dedupeKey: `announcement:${announcement._id}` })));
  }
  let emailFailures = 0;
  if (announcement.isPublished && announcement.channels.includes('email')) {
    const profileFilter = { isActiveInClub: true, 'notificationPreferences.emailAnnouncements': true };
    if (announcement.targetAudience === 'specific_domain') profileFilter.domains = announcement.targetDomain;
    const profiles = await MemberProfile.find(profileFilter).select('userId').lean();
    const users = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('email').lean();
    const results = await Promise.allSettled(users.map((user) => enqueueEmailDelivery({ to: user.email, template: 'announcement', subject: announcement.title, text: announcement.content, idempotencyKey: `announcement:${announcement._id}:${user._id}` })));
    emailFailures = results.filter((result) => result.status === 'rejected').length;
  }
  if (announcement.isPublished) {
    await recordAudit(req, { action: 'announcement.publish', resourceType: 'Announcement', resourceId: announcement._id, metadata: { title: announcement.title, targetAudience: announcement.targetAudience } });
  }
  return res.status(201).json({ success: true, data: { announcement, emailFailures } });
};

export const createAchievement = async (req, res) => {
  const achievement = await Achievement.create(req.body);
  await recordAudit(req, { action: 'achievement.create', resourceType: 'Achievement', resourceId: achievement._id, metadata: { title: achievement.title, isPublished: achievement.isPublished } });
  return res.status(201).json({ success: true, data: achievement });
};

export const updateDomain = async (req, res) => {
  const domain = await Domain.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!domain) return res.status(404).json({ success: false, error: { code: 'DOMAIN_NOT_FOUND', message: 'Domain not found.' } });
  await recordAudit(req, { action: 'domain.update', resourceType: 'Domain', resourceId: domain._id, metadata: auditFields(req.body) });
  return res.json({ success: true, data: domain });
};
