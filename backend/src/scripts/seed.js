import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, closeDB } from '../config/db.js';
import { ClubSession } from '../models/ClubSession.js';
import { Domain } from '../models/Domain.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { MemberGroup } from '../models/MemberGroup.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { DEFAULT_DOMAINS, PERMISSIONS, ROLE_DEFINITIONS } from '../constants/permissions.js';
import { logger } from '../utils/logger.js';
import { backfillMemberSearchFields } from '../services/memberSearchIndexService.js';

const seedReferenceData = async () => {
  const permissionByName = new Map();
  for (const permission of PERMISSIONS) {
    const row = await Permission.findOneAndUpdate(
      { name: permission.name },
      { $set: permission },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    permissionByName.set(row.name, row._id);
  }

  for (const definition of ROLE_DEFINITIONS) {
    await Role.findOneAndUpdate(
      { name: definition.name },
      {
        $set: {
          displayName: definition.displayName,
          description: definition.description,
          level: definition.level,
          permissions: definition.permissions.map((name) => permissionByName.get(name)),
          isSystem: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  for (const domain of DEFAULT_DOMAINS) {
    await Domain.updateOne({ slug: domain.slug }, { $setOnInsert: domain }, { upsert: true });
  }
  await MemberGroup.updateMany({ isArchived: { $exists: false } }, { $set: { isArchived: false, acceptsRequests: true, type: 'custom' } });

  const requestedDomainGroups = [
    ['Creative Arts', 'creative-arts'], ['Photography', 'photography'], ['Content Writing', 'content-writing'],
    ['Open Mic', 'open-mic-stand-up-comedy'], ['Video Editing', 'cinematics-video-editing'],
    ['Stand Up Comedy', 'open-mic-stand-up-comedy'], ['Cinematics', 'cinematics-video-editing'],
    ['Graphic Designing', 'graphic-designing'], ['Personality Development', 'personality-development'],
  ];
  for (const [name, domainSlug] of requestedDomainGroups) {
    const domain = await Domain.findOne({ slug: domainSlug }).select('_id').lean();
    const slug = `domain-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await MemberGroup.updateOne({ slug }, { $setOnInsert: { name, slug, type: 'domain', domainId: domain?._id || null, description: '', acceptsRequests: true, isArchived: false, isActive: true } }, { upsert: true });
  }
  await MemberGroup.updateOne({ slug: 'core-team' }, { $set: { acceptsRequests: true }, $setOnInsert: { name: 'Core Team', slug: 'core-team', type: 'core', description: 'Core team members', isArchived: false, isActive: true } }, { upsert: true });
  const seededGroups = await MemberGroup.find({ type: 'domain' }).select('_id domainId').lean();
  const profiles = await MemberProfile.find({ domains: { $in: seededGroups.map((group) => group.domainId).filter(Boolean) } }).select('userId domains').lean();
  const memberships = profiles.flatMap((profile) => profile.domains.flatMap((domainId) => {
    const group = seededGroups.find((row) => String(row.domainId) === String(domainId));
    return group ? [{ updateOne: { filter: { groupId: group._id, userId: profile.userId }, update: { $setOnInsert: { groupId: group._id, userId: profile.userId, role: 'member' } }, upsert: true } }] : [];
  }));
  if (memberships.length) await GroupMembership.bulkWrite(memberships, { ordered: false });
  const coreGroup = await MemberGroup.findOne({ slug: 'core-team' }).select('_id');
  const coreRoles = await Role.find({ name: { $in: ['domain_admin', 'admin', 'super_admin'] } }).select('_id');
  const coreLeaders = await UserRole.find({ roleId: { $in: coreRoles.map((role) => role._id) } }).distinct('userId');
  if (coreLeaders.length) await GroupMembership.bulkWrite(
    coreLeaders.map((userId) => ({
      updateOne: {
        filter: { groupId: coreGroup._id, userId },
        update: { $set: { role: 'lead' }, $setOnInsert: { groupId: coreGroup._id, userId } },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const currentSession = await ClubSession.findOne({ isCurrent: true });
  if (!currentSession) {
    const now = new Date();
    const startYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
    await ClubSession.create({
      name: `${startYear}-${startYear + 1}`,
      startDate: new Date(Date.UTC(startYear, 6, 1)),
      endDate: new Date(Date.UTC(startYear + 1, 5, 30, 23, 59, 59)),
      isCurrent: true,
    });
  }

  logger.info('Reference data seeded', { roles: ROLE_DEFINITIONS.length, permissions: PERMISSIONS.length, domains: DEFAULT_DOMAINS.length, groups: await MemberGroup.countDocuments({}) });
};

const seedSuperAdmin = async () => {
  if (!env.superAdminEmail && !env.superAdminPassword) return;
  if (!env.superAdminEmail || !env.superAdminPassword) {
    throw new Error('Set both SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to create the initial administrator.');
  }
  if (env.superAdminPassword.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const email = env.superAdminEmail.trim().toLowerCase();
  const [firstName, ...lastNameParts] = email.split('@')[0].split(/[._-]+/).filter(Boolean);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        email,
        firstName: firstName ? firstName[0].toUpperCase() + firstName.slice(1) : 'Club',
        lastName: lastNameParts.map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') || 'Administrator',
        passwordHash: await bcrypt.hash(env.superAdminPassword, 12),
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const role = await Role.findOne({ name: 'super_admin' }).select('_id');
  await UserRole.updateOne({ userId: user._id, roleId: role._id }, { $setOnInsert: { assignedBy: user._id } }, { upsert: true });
  await MemberProfile.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true });
  logger.info('Initial administrator is ready', { email });
};

const run = async () => {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required to seed the database.');
  await connectDB();
  await seedReferenceData();
  await backfillMemberSearchFields();
  await seedSuperAdmin();
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
};

run()
  .catch((error) => {
    logger.error('Database seed failed', { errorName: error.name, errorMessage: error.message });
    process.exitCode = 1;
  })
  .finally(closeDB);
