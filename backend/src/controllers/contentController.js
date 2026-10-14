import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { ApprovalDecision } from '../models/ApprovalDecision.js';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { Announcement } from '../models/Announcement.js';
import { Domain } from '../models/Domain.js';
import { Post } from '../models/Post.js';
import { PostMedia } from '../models/PostMedia.js';
import { PostRevision } from '../models/PostRevision.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { User } from '../models/User.js';
import { deleteCloudAsset, uploadBuffer } from '../config/cloudinary.js';
import { canAccessDomain, isSuperAdmin } from '../utils/authorization.js';
import { recordAudit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const contentTypes = ['artwork', 'photography', 'reel', 'video', 'article', 'poster', 'event_coverage'];
const domainFor = async (id) => Domain.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { slug: String(id).toLowerCase() }] });
const ensureDomainAccess = (req, domainId) => {
  if (!canAccessDomain(req.auth, domainId)) throw fail(403, 'DOMAIN_SCOPE_FORBIDDEN', 'You cannot access content in this domain.');
};
const postSnapshot = (post) => ({ title: post.title, description: post.description, contentType: post.contentType, domain: post.domain, tags: post.tags, articleContent: post.articleContent, associatedEvent: post.associatedEvent });

export const createDraft = async (req, res) => {
  const domain = await domainFor(req.body.domainId);
  if (!domain || !domain.isActive) throw fail(400, 'INVALID_DOMAIN', 'Choose an active creative domain.');
  ensureDomainAccess(req, domain._id);
  const contentType = req.body.contentType;
  if (!contentTypes.includes(contentType)) throw fail(400, 'INVALID_CONTENT_TYPE', 'Choose a supported content format.');
  const post = await Post.create({
    title: req.body.title,
    slug: `${req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 190)}-${randomUUID().slice(0, 8)}`,
    description: req.body.description || '', contentType, domain: domain._id, author: req.auth.userId,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [], articleContent: req.body.articleContent || '',
    associatedEvent: req.body.associatedEvent || null, status: 'draft',
  });
  await recordAudit(req, { action: 'post.create', resourceType: 'Post', resourceId: post._id, metadata: { contentType: post.contentType, domain: String(post.domain) } });
  return res.status(201).json({ success: true, data: post });
};

export const uploadPostMedia = async (req, res) => {
  if (!req.file) throw fail(400, 'FILE_REQUIRED', 'Choose an image or video to upload.');
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, 'POST_NOT_FOUND', 'Post not found.');
  if (String(post.author) !== req.auth.userId && !['admin', 'super_admin'].some((role) => req.auth.roles.includes(role))) throw fail(403, 'POST_FORBIDDEN', 'You can only add media to your own post.');
  ensureDomainAccess(req, post.domain);
  if (!['draft', 'changes_requested'].includes(post.status)) throw fail(409, 'POST_NOT_EDITABLE', 'Media can only be changed while the post is a draft or revision.');
  const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const uploaded = await uploadBuffer(req.file.buffer, { folder: 'theimpeccables/posts', resource_type: resourceType, overwrite: false });
  try {
    const media = await PostMedia.create({ postId: post._id, url: uploaded.secure_url, publicId: uploaded.public_id, mediaType: resourceType, mimeType: req.file.mimetype, sizeBytes: req.file.size, width: uploaded.width, height: uploaded.height, duration: uploaded.duration, thumbnailUrl: resourceType === 'video' ? uploaded.secure_url.replace(/\.\w+$/, '.jpg') : uploaded.secure_url });
    return res.status(201).json({ success: true, data: media });
  } catch (error) {
    await deleteCloudAsset(uploaded.public_id, resourceType).catch(() => {});
    throw error;
  }
};

export const updateDraft = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, 'POST_NOT_FOUND', 'Post not found.');
  if (String(post.author) !== req.auth.userId && !['admin', 'super_admin'].some((role) => req.auth.roles.includes(role))) throw fail(403, 'POST_FORBIDDEN', 'You can only edit your own post.');
  if (!['draft', 'changes_requested', 'rejected'].includes(post.status)) throw fail(409, 'POST_NOT_EDITABLE', 'This post can no longer be edited.');
  if (req.body.domainId) {
    const domain = await domainFor(req.body.domainId);
    if (!domain || !domain.isActive) throw fail(400, 'INVALID_DOMAIN', 'Choose an active creative domain.');
    ensureDomainAccess(req, domain._id);
    post.domain = domain._id;
  }
  await PostRevision.create({ postId: post._id, version: await PostRevision.countDocuments({ postId: post._id }) + 1, editedBy: req.auth.userId, snapshot: postSnapshot(post) });
  for (const field of ['title', 'description', 'contentType', 'tags', 'articleContent', 'associatedEvent']) if (req.body[field] !== undefined) post[field] = req.body[field];
  post.status = 'draft';
  await post.save();
  await recordAudit(req, { action: 'post.edit', resourceType: 'Post', resourceId: post._id });
  return res.json({ success: true, data: post });
};

export const submitDraft = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, 'POST_NOT_FOUND', 'Post not found.');
  if (String(post.author) !== req.auth.userId && !isSuperAdmin(req.auth)) throw fail(403, 'POST_FORBIDDEN', 'Only the post author can submit it.');
  ensureDomainAccess(req, post.domain);
  if (!['draft', 'changes_requested', 'rejected'].includes(post.status)) throw fail(409, 'INVALID_POST_STATE', 'This post is not ready to be submitted.');
  const hasMedia = await PostMedia.exists({ postId: post._id, status: 'ready' });
  if (!hasMedia && post.contentType !== 'article' && !post.articleContent) throw fail(400, 'POST_MEDIA_REQUIRED', 'Add an image or video before submitting.');
  const previous = await ApprovalRequest.findOne({ postId: post._id }).sort({ currentVersion: -1 });
  const version = previous ? previous.currentVersion + 1 : 1;
  const approval = await ApprovalRequest.create({ postId: post._id, domain: post.domain, submittedBy: req.auth.userId, currentVersion: version });
  post.status = 'under_review';
  await post.save();
  await recordAudit(req, { action: 'post.submit', resourceType: 'Post', resourceId: post._id, metadata: { approvalVersion: version } });
  return res.status(201).json({ success: true, data: { post, approval } });
};

export const listMyPosts = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter = { author: req.auth.userId };
  const [items, total] = await Promise.all([Post.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('domain', 'name slug').lean(), Post.countDocuments(filter)]);
  const { PostMedia } = await import('../models/PostMedia.js');
  const media = await PostMedia.find({ postId: { $in: items.map((post) => post._id) }, status: 'ready' }).sort({ sortOrder: 1 }).lean();
  const byPost = new Map(); for (const item of media) byPost.set(String(item.postId), [...(byPost.get(String(item.postId)) || []), item]);
  for (const post of items) post.media = byPost.get(String(post._id)) || [];
  return res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

export const listApprovalQueue = async (req, res) => {
  const filter = {};
  if (['pending', 'approved', 'rejected', 'changes_requested'].includes(req.query.status)) filter.status = req.query.status;
  else if (req.query.status !== 'all') filter.status = 'pending';
  if (req.auth.roles.includes('domain_admin') && !req.auth.roles.some((role) => ['admin', 'super_admin'].includes(role))) filter.domain = { $in: req.auth.domainIds };
  const requests = await ApprovalRequest.find(filter).sort({ submittedAt: 1 }).populate('domain', 'name slug').populate('submittedBy', 'firstName lastName').populate('postId').lean();
  const media = await PostMedia.find({ postId: { $in: requests.map((request) => request.postId?._id).filter(Boolean) }, status: 'ready' }).sort({ sortOrder: 1 }).lean();
  const byPost = new Map();
  for (const item of media) byPost.set(String(item.postId), [...(byPost.get(String(item.postId)) || []), item]);
  return res.json({ success: true, data: requests.map((request) => ({ ...request, media: byPost.get(String(request.postId?._id)) || [] })) });
};

export const decideApproval = async (req, res) => {
  const approval = await ApprovalRequest.findById(req.params.id).populate('postId');
  if (!approval || approval.status !== 'pending') throw fail(404, 'APPROVAL_NOT_FOUND', 'Pending approval not found.');
  ensureDomainAccess(req, approval.domain);
  const domain = await Domain.findById(approval.domain);
  const superAdmin = isSuperAdmin(req.auth);
  const isOwnSubmission = String(approval.submittedBy) === req.auth.userId;
  if (isOwnSubmission && !superAdmin && !domain.approvalConfig.selfApprovalAllowed) {
    throw fail(403, 'SELF_APPROVAL_FORBIDDEN', 'You cannot review your own submission.');
  }
  const decision = req.body.decision;
  try {
    await ApprovalDecision.create({ approvalRequestId: approval._id, reviewerId: req.auth.userId, decision, comments: req.body.comments || '', version: approval.currentVersion });
  } catch (error) {
    if (error.code === 11000) throw fail(409, 'ALREADY_REVIEWED', 'You have already reviewed this version.');
    throw error;
  }
  const post = approval.postId;
  if (decision === 'approved') {
    const approvedCount = await ApprovalDecision.countDocuments({ approvalRequestId: approval._id, version: approval.currentVersion, decision: 'approved' });
    if (superAdmin || approvedCount >= domain.approvalConfig.requiredApprovals) {
      approval.status = 'approved'; approval.resolvedAt = new Date(); approval.resolvedBy = req.auth.userId;
      post.status = 'approved';
      await post.save();
    }
  } else {
    approval.status = decision; approval.resolvedAt = new Date(); approval.resolvedBy = req.auth.userId;
    post.status = decision;
    await post.save();
  }
  await approval.save();
  await createNotification({ recipient: approval.submittedBy, type: 'approval', title: decision === 'approved' ? 'Submission approved' : 'Submission needs changes', message: decision === 'approved' ? `Your submission “${post.title}” was approved.` : `Your submission “${post.title}” was ${decision.replaceAll('_', ' ')}.`, href: '/dashboard', relatedModel: 'ApprovalRequest', relatedId: approval._id, dedupeKey: `approval:${approval._id}:${approval.currentVersion}:${decision}` });
  await recordAudit(req, { action: `approval.${decision}`, resourceType: 'ApprovalRequest', resourceId: approval._id, metadata: { postId: String(post._id), version: approval.currentVersion } });
  return res.json({ success: true, data: { approval, post } });
};

export const publishPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, 'POST_NOT_FOUND', 'Post not found.');
  ensureDomainAccess(req, post.domain);
  if (!['approved', 'unpublished'].includes(post.status)) throw fail(409, 'POST_NOT_APPROVED', 'Only approved posts can be published.');
  post.status = 'published'; post.publishedAt = post.publishedAt || new Date();
  await post.save();
  const announcement = await Announcement.findOneAndUpdate({ relatedPost: post._id, type: 'new_post' }, { $setOnInsert: { title: `New work: ${post.title}`, summary: post.description.slice(0, 500), content: post.description || post.title, icon: 'Megaphone', type: 'new_post', relatedPost: post._id, targetAudience: 'public', channels: ['in_app'], sentBy: req.auth.userId, sentAt: new Date(), isPublished: true } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const profiles = await MemberProfile.find({ isActiveInClub: true, 'notificationPreferences.inAppAll': true }).select('userId').lean();
  const recipients = await User.find({ _id: { $in: profiles.map((profile) => profile.userId) }, isActive: true }).select('_id').lean();
  await Promise.all(recipients.map((user) => createNotification({ recipient: user._id, type: 'announcement', title: announcement.title, message: announcement.summary || announcement.content, href: `/gallery/${post.slug}`, relatedModel: 'Post', relatedId: post._id, dedupeKey: `published-post:${post._id}` })));
  await recordAudit(req, { action: 'post.publish', resourceType: 'Post', resourceId: post._id, metadata: { domain: String(post.domain) } });
  return res.json({ success: true, data: post });
};

export const moderatePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw fail(404, 'POST_NOT_FOUND', 'Post not found.');
  if (!['published', 'unpublished'].includes(post.status)) throw fail(409, 'INVALID_POST_STATE', 'Only published works can be moderated.');
  post.status = req.body.published ? 'published' : 'unpublished';
  await post.save();
  await recordAudit(req, { action: post.status === 'published' ? 'post.moderation.republish' : 'post.moderation.unpublish', resourceType: 'Post', resourceId: post._id, metadata: { status: post.status } });
  return res.json({ success: true, data: post });
};
