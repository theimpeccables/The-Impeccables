import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, closeDB } from '../config/db.js';
import { Domain } from '../models/Domain.js';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { DEFAULT_DOMAINS, ROLE_NAMES } from '../constants/permissions.js';
import { logger } from '../utils/logger.js';

const TEST_EMAIL_DOMAIN = 'impeccables.test';
const password = process.env.TEST_ACCOUNT_PASSWORD;

const ensureAccount = async ({ email, firstName, lastName, roleName, domain, assignedBy }) => {
  const role = await Role.findOne({ name: roleName }).select('_id');
  if (!role) throw new Error(`Role '${roleName}' is missing. Run 'npm run seed' first.`);

  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: { firstName, lastName, isActive: true, passwordHash: await bcrypt.hash(password, 12) },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await UserRole.updateOne(
    { userId: user._id, roleId: role._id },
    { $setOnInsert: { assignedBy: assignedBy || user._id } },
    { upsert: true },
  );

  if (domain) {
    await MemberProfile.updateOne(
      { userId: user._id },
      { $set: { domains: [domain._id] }, $setOnInsert: { userId: user._id } },
      { upsert: true },
    );
    if (roleName === 'domain_admin') {
      await DomainAdmin.updateOne(
        { userId: user._id, domainId: domain._id },
        { $set: { isActive: true, assignedBy: assignedBy || user._id }, $setOnInsert: { userId: user._id, domainId: domain._id } },
        { upsert: true },
      );
    }
  }
  return email;
};

const run = async () => {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required to seed test accounts.');
  if (env.nodeEnv === 'production') throw new Error('QA accounts cannot be seeded when NODE_ENV=production.');
  if (!password || password.length < 12) {
    throw new Error('Set TEST_ACCOUNT_PASSWORD in backend/.env to a unique password of at least 12 characters.');
  }

  await connectDB();
  const domains = await Domain.find({ slug: { $in: DEFAULT_DOMAINS.map(({ slug }) => slug) } }).sort({ sortOrder: 1 });
  if (domains.length !== DEFAULT_DOMAINS.length) throw new Error("Some domains are missing. Run 'npm run seed' first.");

  const superAdmin = await User.findOne({ email: `qa.super-admin@${TEST_EMAIL_DOMAIN}` }).select('_id');
  const accounts = [];
  for (const domain of domains) {
    const slug = domain.slug;
    accounts.push(await ensureAccount({
      email: `qa.member.${slug}@${TEST_EMAIL_DOMAIN}`,
      firstName: 'QA', lastName: `${domain.name} Member`, roleName: 'member', domain, assignedBy: superAdmin?._id,
    }));
    accounts.push(await ensureAccount({
      email: `qa.domain-admin.${slug}@${TEST_EMAIL_DOMAIN}`,
      firstName: 'QA', lastName: `${domain.name} Admin`, roleName: 'domain_admin', domain, assignedBy: superAdmin?._id,
    }));
  }

  accounts.push(await ensureAccount({
    email: `qa.admin@${TEST_EMAIL_DOMAIN}`, firstName: 'QA', lastName: 'Club Admin', roleName: 'admin', assignedBy: superAdmin?._id,
  }));
  accounts.push(await ensureAccount({
    email: `qa.super-admin@${TEST_EMAIL_DOMAIN}`, firstName: 'QA', lastName: 'Super Admin', roleName: 'super_admin',
  }));

  logger.info('QA test accounts are ready', {
    total: accounts.length,
    domains: domains.length,
    roles: ROLE_NAMES,
    sharedPasswordVariable: 'TEST_ACCOUNT_PASSWORD',
    accounts,
  });
};

run()
  .catch((error) => {
    logger.error('QA test account seed failed', { errorName: error.name, errorMessage: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await closeDB();
  });
