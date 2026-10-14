import { Announcement } from '../models/Announcement.js';
import { Achievement } from '../models/Achievement.js';
import { Event } from '../models/Event.js';
import { Post } from '../models/Post.js';
import { Domain } from '../models/Domain.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { User } from '../models/User.js';
import { sendEmail } from '../config/mailer.js';
import { env } from '../config/env.js';

const pageOptions = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12)),
});
const paginate = async (model, filter, query, sort, populate = '') => {
  const { page, limit } = pageOptions(query);
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate(populate).lean(),
    model.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const listPublicPosts = async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.domain) {
    const domain = await Domain.findOne({ slug: req.query.domain, isActive: true }).select('_id').lean();
    if (!domain) return res.json({ success: true, data: { items: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } } });
    filter.domain = domain._id;
  }
  if (req.query.featured === 'true') filter.isFeatured = true;
  const result = await paginate(Post, filter, req.query, { isFeatured: -1, publishedAt: -1 }, 'domain author');
  await Post.populate(result.items, [{ path: 'domain', select: 'name slug' }, { path: 'author', select: 'firstName lastName' }]);
  const ids = result.items.map((post) => post._id);
  const { PostMedia } = await import('../models/PostMedia.js');
  const media = await PostMedia.find({ postId: { $in: ids }, status: 'ready' }).sort({ sortOrder: 1 }).lean();
  const byPost = new Map();
  for (const item of media) {
    const postId = String(item.postId);
    byPost.set(postId, [...(byPost.get(postId) || []), item]);
  }
  result.items = result.items.map((post) => ({ ...post, media: byPost.get(String(post._id)) || [] }));
  return res.json({ success: true, data: result });
};

export const getPublicPost = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' }).populate('domain', 'name slug').populate('author', 'firstName lastName').lean();
  if (!post) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found.' } });
  const { PostMedia } = await import('../models/PostMedia.js');
  post.media = await PostMedia.find({ postId: post._id, status: 'ready' }).sort({ sortOrder: 1 }).lean();
  return res.json({ success: true, data: post });
};

export const listPublicEvents = async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.upcoming === 'true') filter.date = { $gte: new Date() };
  if (req.query.past === 'true') filter.date = { $lt: new Date() };
  return res.json({ success: true, data: await paginate(Event, filter, req.query, { date: 1 }) });
};

export const getPublicEvent = async (req, res) => {
  const event = await Event.findOne({ slug: req.params.slug, isPublished: true }).populate('domains', 'name slug').lean();
  if (!event) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
  return res.json({ success: true, data: event });
};

export const listPublicAnnouncements = async (req, res) => res.json({
  success: true,
  data: await paginate(Announcement, { isPublished: true, targetAudience: 'public' }, req.query, { sentAt: -1, createdAt: -1 }),
});

export const listPublicAchievements = async (req, res) => res.json({
  success: true,
  data: await paginate(Achievement, { isPublished: true }, req.query, { awardedAt: -1, createdAt: -1 }, 'event'),
});

export const listPublicTeam = async (req, res) => {
  const profiles = await MemberProfile.find({ isPublic: true, isActiveInClub: true }).sort({ createdAt: 1 }).populate('domains', 'name slug').lean();
  const ids = profiles.map((profile) => profile.userId);
  const users = await User.find({ _id: { $in: ids }, isActive: true }).select('firstName lastName profilePhoto').lean();
  const byId = new Map(users.map((user) => [String(user._id), { ...user, name: `${user.firstName} ${user.lastName}`.trim(), image: user.profilePhoto }]));
  return res.json({ success: true, data: profiles.flatMap((profile) => {
    const user = byId.get(String(profile.userId));
    return user ? [{ id: String(user._id), name: user.name, image: user.avatar || '', role: profile.roleTitle || '', bio: profile.bio, year: profile.year, branch: profile.branch, domain: profile.domains.map((domain) => domain.name).join(', '), socials: profile.portfolioLinks }] : [];
  }) });
};

export const submitContactMessage = async (req, res) => {
  const { name, email, rollNo, domainInterest, message } = req.body;
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password || !env.contactEmail) {
    return res.status(503).json({ success: false, error: { code: 'CONTACT_UNAVAILABLE', message: 'The contact form is not configured yet. Please try again later.' } });
  }
  await sendEmail({
    to: env.contactEmail,
    replyTo: email,
    subject: `Website enquiry from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nRoll number: ${rollNo || 'Not provided'}\nDomain interest: ${domainInterest || 'Not provided'}\n\n${message}`,
  });
  return res.status(202).json({ success: true, data: { message: 'Your message has been received.' } });
};

export const getPublicSitemap = async (_req, res) => {
  const base = env.frontendUrl.replace(/\/$/, '');
  const [domains, events, posts] = await Promise.all([
    Domain.find({ isActive: true }).select('slug updatedAt').lean(),
    Event.find({ isPublished: true }).select('slug updatedAt').lean(),
    Post.find({ status: 'published' }).select('slug updatedAt').lean(),
  ]);
  const urls = ['/', '/about', '/domains', '/gallery', '/events', '/team', '/achievements', '/announcements', '/contact']
    .map((path) => `<url><loc>${base}${path}</loc></url>`);
  for (const [path, items] of [['/domains/', domains], ['/events/', events]]) {
    for (const item of items) urls.push(`<url><loc>${base}${path}${encodeURIComponent(item.slug)}</loc><lastmod>${new Date(item.updatedAt).toISOString()}</lastmod></url>`);
  }
  for (const post of posts) if (post.slug) urls.push(`<url><loc>${base}/gallery/${encodeURIComponent(post.slug)}</loc><lastmod>${new Date(post.updatedAt).toISOString()}</lastmod></url>`);
  return res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
};
