import mongoose from 'mongoose';
import { matchedData } from 'express-validator';
import { Domain } from '../models/Domain.js';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { getUserContext, revokeAllUserSessions, toPublicUser } from '../services/authService.js';
import { getHighestRole, isSuperAdmin } from '../utils/authorization.js';
import { recordAudit } from '../services/auditService.js';
import { deleteCloudAsset, uploadBuffer } from '../config/cloudinary.js';

const parsePage = (value, fallback, max) => Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), max);
const safeUser = (user) => ({
  id: String(user._id),
  name: `${user.firstName} ${user.lastName}`.trim(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  avatar: user.profilePhoto || '',
  profilePhoto: user.profilePhoto || '',
  phone: user.phone || '',
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

export const getMyProfile = async (req, res) => {
  const profile = await MemberProfile.findOne({ userId: req.user._id }).populate('domains', 'name slug');
  const context = await getUserContext(req.user._id);
  return res.json({ success: true, data: { user: toPublicUser(req.user, context), profile } });
};

export const updateMyProfile = async (req, res) => {
  const fields = matchedData(req, { locations: ['body'] });
  const { firstName, lastName, phone, dateOfBirth, ...profileFields } = fields;
  if (firstName !== undefined) req.user.firstName = firstName;
  if (lastName !== undefined) req.user.lastName = lastName;
  if (phone !== undefined) req.user.phone = phone;
  if (dateOfBirth !== undefined) req.user.dateOfBirth = dateOfBirth;
  if (firstName !== undefined || lastName !== undefined || phone !== undefined || dateOfBirth !== undefined) await req.user.save();

  const profile = await MemberProfile.findOneAndUpdate(
    { userId: req.user._id },
    { $set: profileFields },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate('domains', 'name slug');
  const context = await getUserContext(req.user._id);
  return res.json({ success: true, data: { user: toPublicUser(req.user, context), profile } });
};

export const uploadMyProfilePhoto = async (req, res) => {
  if (!req.file) throw Object.assign(new Error('Choose a profile photo to upload.'), { statusCode: 400, code: 'FILE_REQUIRED' });
  const user = await User.findById(req.user._id).select('+profilePhotoPublicId');
  if (!user) throw Object.assign(new Error('Account not found.'), { statusCode: 404, code: 'MEMBER_NOT_FOUND' });
  const uploaded = await uploadBuffer(req.file.buffer, {
    folder: 'avatars', public_id: `${user._id}/avatar`, format: 'webp', resource_type: 'image', overwrite: true, invalidate: true,
    transformation: [{ width: 640, height: 640, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  });
  user.profilePhoto = uploaded.secure_url;
  user.profilePhotoPublicId = uploaded.public_id;
  await user.save();
  const context = await getUserContext(user._id);
  return res.json({ success: true, data: { user: toPublicUser(user, context) } });
};

export const removeMyProfilePhoto = async (req, res) => {
  const user = await User.findById(req.user._id).select('+profilePhotoPublicId');
  if (!user) throw Object.assign(new Error('Account not found.'), { statusCode: 404, code: 'MEMBER_NOT_FOUND' });
  const publicId = user.profilePhotoPublicId;
  user.profilePhoto = '';
  user.profilePhotoPublicId = undefined;
  await user.save();
  if (publicId) await deleteCloudAsset(publicId).catch((error) => req.log?.warn?.({ error }, 'Could not remove old profile image from storage'));
  const context = await getUserContext(user._id);
  return res.json({ success: true, data: { user: toPublicUser(user, context) } });
};

export const listMembers = async (req, res) => {
  const page = parsePage(req.query.page, 1, 100_000);
  const limit = parsePage(req.query.limit, 20, 100);
  const query = {};
  if (req.query.status === 'inactive') query.isActive = false;
  else if (req.query.status !== 'all') query.isActive = true;
  const search = String(req.query.search || '').trim().slice(0, 100);
  if (search) {
    const escapedPrefix = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    const prefix = (value) => ({ $regex: `^${escapedPrefix(value)}` });
    query.$or = [
      { firstNameSearch: prefix(tokens[0]) },
      { lastNameSearch: prefix(tokens[0]) },
      { email: prefix(tokens.join('')) },
      ...(tokens.length > 1 ? [
        { $and: [{ firstNameSearch: prefix(tokens[0]) }, { lastNameSearch: prefix(tokens.slice(1).join(' ')) }] },
        { $and: [{ lastNameSearch: prefix(tokens[0]) }, { firstNameSearch: prefix(tokens.slice(1).join(' ')) }] },
      ] : []),
    ];
  }
  const [users, total] = await Promise.all([
    User.find(query).sort({ lastName: 1, firstName: 1, _id: 1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);
  const userIds = users.map(({ _id }) => _id);
  const [assignments, domainAssignments] = await Promise.all([
    UserRole.find({ userId: { $in: userIds } }).populate('roleId', 'name'),
    DomainAdmin.find({ userId: { $in: userIds }, isActive: true }).select('userId domainId'),
  ]);
  const rolesByUser = new Map();
  for (const { userId, roleId } of assignments) {
    if (!roleId) continue;
    const key = String(userId);
    rolesByUser.set(key, [...(rolesByUser.get(key) || []), roleId.name]);
  }
  const domainsByUser = new Map();
  for (const { userId, domainId } of domainAssignments) {
    const key = String(userId);
    domainsByUser.set(key, [...(domainsByUser.get(key) || []), String(domainId)]);
  }
  return res.json({
    success: true,
    data: users.map((user) => {
      const roles = rolesByUser.get(String(user._id)) || ['member'];
      return {
        ...safeUser(user),
        roles,
        role: getHighestRole(roles),
        domainIds: domainsByUser.get(String(user._id)) || [],
      };
    }),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getMember = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  }
  const isSelf = String(req.user._id) === req.params.id;
  if (!isSelf && !isSuperAdmin(req.auth) && !req.auth.permissions.includes('member:view')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot view this member profile.' } });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  const profile = await MemberProfile.findOne({ userId: user._id }).populate('domains', 'name slug');
  const context = await getUserContext(user._id);
  return res.json({ success: true, data: { user: toPublicUser(user, context), profile } });
};

export const updateMember = async (req, res) => {
  const fields = matchedData(req, { locations: ['body'] });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  for (const field of ['firstName', 'lastName', 'phone', 'profilePhoto']) {
    if (fields[field] !== undefined) user[field] = fields[field];
  }
  await user.save();
  return res.json({ success: true, data: { member: safeUser(user) } });
};

export const updateMemberStatus = async (req, res) => {
  if (String(req.user._id) === req.params.id && req.body.isActive === false) {
    return res.status(400).json({ success: false, error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account.' } });
  }
  if (req.body.isActive === false) {
    const superAdminRole = await Role.findOne({ name: 'super_admin' }).select('_id');
    const assignment = superAdminRole && await UserRole.findOne({ userId: req.params.id, roleId: superAdminRole._id });
    if (assignment) {
      const [activeCount] = await UserRole.aggregate([
        { $match: { roleId: superAdminRole._id } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $match: { 'user.isActive': true } },
        { $count: 'total' },
      ]);
      if ((activeCount?.total || 0) <= 1) {
        return res.status(409).json({ success: false, error: { code: 'LAST_SUPER_ADMIN', message: 'The last active Super Admin account cannot be deactivated.' } });
      }
    }
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: req.body.isActive } }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
  if (!user.isActive) {
    // Account deactivation blocks new access tokens and revokes every refresh session.
    await revokeAllUserSessions(user._id);
  }
  await recordAudit(req, { action: user.isActive ? 'member.activate' : 'member.deactivate', resourceType: 'User', resourceId: user._id, metadata: { isActive: user.isActive } });
  return res.json({ success: true, data: { member: safeUser(user) } });
};

export const getPublicTeam = async (_req, res) => {
  const profiles = await MemberProfile.find({ isPublic: true, isActiveInClub: true })
    .populate({ path: 'userId', match: { isActive: true }, select: 'firstName lastName profilePhoto' })
    .populate('domains', 'name slug')
    .sort({ joinedAt: 1 });
  const team = profiles.filter(({ userId }) => userId).map(({ userId, bio, domains, portfolioLinks }) => ({
    id: String(userId._id),
    name: `${userId.firstName} ${userId.lastName}`.trim(),
    avatar: userId.profilePhoto || '',
    bio,
    domains,
    portfolioLinks,
  }));
  return res.json({ success: true, data: team });
};

export const getMemberDirectory = async (req, res) => {
  const limit = parsePage(req.query.limit, 20, 100);
  const page = parsePage(req.query.page, 1, 100_000);
  const search = String(req.query.search || '').trim().slice(0, 100);
  const pipeline = [
    { $match: { isActiveInClub: true } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.isActive': true } },
    { $lookup: { from: 'domains', localField: 'domains', foreignField: '_id', as: 'domainRows' } },
  ];
  if (search) {
    const escaped = search.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pipeline.push({ $match: { $or: [
      { 'user.firstNameSearch': { $regex: `^${escaped}` } },
      { 'user.lastNameSearch': { $regex: `^${escaped}` } },
      { 'user.email': { $regex: `^${escaped}` } },
    ] } });
  }
  pipeline.push(
    { $sort: { 'user.lastName': 1, 'user.firstName': 1, _id: 1 } },
    { $facet: {
      data: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: {
          id: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          email: '$user.email',
          avatar: '$user.profilePhoto',
          bio: 1,
          domains: { $map: { input: '$domainRows', as: 'domain', in: { name: '$$domain.name', slug: '$$domain.slug' } } },
        } },
      ],
      metadata: [{ $count: 'total' }],
    } },
  );
  const [result] = await MemberProfile.aggregate(pipeline);
  const total = result?.metadata?.[0]?.total || 0;
  const data = (result?.data || []).map((member) => ({
    ...member,
    id: String(member.id),
    name: `${member.firstName} ${member.lastName}`.trim(),
  }));
  return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

export const validateMemberId = (req, res, next) => {
  if (mongoose.isValidObjectId(req.params.id)) return next();
  return res.status(404).json({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found.' } });
};

export const validateDomainIds = async (domainIds = []) => {
  if (!Array.isArray(domainIds) || domainIds.length === 0) return false;
  if (domainIds.some((id) => !mongoose.isValidObjectId(id))) return false;
  if (new Set(domainIds.map(String)).size !== domainIds.length) return false;
  return (await Domain.countDocuments({ _id: { $in: domainIds }, isActive: true })) === new Set(domainIds.map(String)).size;
};
