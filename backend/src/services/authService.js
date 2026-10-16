import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, requireEnvironmentValues } from '../config/env.js';
import { sendEmail } from '../config/mailer.js';
import { DomainAdmin } from '../models/DomainAdmin.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { getHighestRole } from '../utils/authorization.js';
import { logger } from '../utils/logger.js';

const PASSWORD_COST = 12;
const dummyPasswordHash = bcrypt.hashSync('not-a-real-password-for-timing-equalization', PASSWORD_COST);
const REFRESH_COOKIE_NAME = 'impeccables_refresh';

const httpError = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const durationMilliseconds = (duration) => {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(duration);
  if (!match) throw new Error('JWT expiry values must use a positive s, m, h, or d duration.');
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * factors[match[2]];
};

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: `${env.apiPrefix.replace(/\/$/, '')}/auth`,
  maxAge: durationMilliseconds(env.jwtRefreshExpiresIn),
});

export const clearRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: `${env.apiPrefix.replace(/\/$/, '')}/auth`,
});

export const getUserContext = async (userId) => {
  const [assignments, domainAdmins, profile] = await Promise.all([
    UserRole.find({ userId }).populate({
      path: 'roleId',
      select: 'name permissions',
      populate: { path: 'permissions', select: 'name' },
    }),
    DomainAdmin.find({ userId, isActive: true }).select('domainId'),
    MemberProfile.findOne({ userId }).populate('domains', 'slug name'),
  ]);
  const roles = [...new Set(assignments.map(({ roleId }) => roleId?.name).filter(Boolean))];
  const permissions = [...new Set(assignments.flatMap(({ roleId }) =>
    (roleId?.permissions || []).map((permission) => permission.name)))];
  const domainIds = [...new Set(domainAdmins.map(({ domainId }) => String(domainId)))];
  return {
    roles: roles.length ? roles : ['member'],
    role: getHighestRole(roles),
    permissions,
    domainIds,
    profile,
  };
};

const photoWithVersion = (user) => {
  if (!user.profilePhoto) return '';
  try {
    const url = new URL(user.profilePhoto);
    if (user.updatedAt) url.searchParams.set('v', new Date(user.updatedAt).getTime().toString());
    return url.toString();
  } catch { return user.profilePhoto; }
};

export const toPublicUser = (user, context) => ({
  id: String(user._id),
  email: user.email,
  name: user.name || `${user.firstName} ${user.lastName}`.trim(),
  firstName: user.firstName,
  lastName: user.lastName,
  avatar: photoWithVersion(user),
  profilePhoto: photoWithVersion(user),
  phone: user.phone || '',
  dateOfBirth: user.dateOfBirth || null,
  birthdayEmailOptOut: Boolean(user.birthdayEmailOptOut),
  showBirthdayToClub: user.showBirthdayToClub !== false,
  role: context.role,
  roles: context.roles,
  permissions: context.permissions,
  domainIds: context.domainIds,
  assignedDomain: context.profile?.domains?.[0]?.slug || null,
  profile: context.profile || null,
});

const createAccessToken = (userId) => {
  requireEnvironmentValues([['JWT_ACCESS_SECRET', env.jwtAccessSecret]], 'JWT access token');
  return jwt.sign({ tokenUse: 'access' }, env.jwtAccessSecret, {
    subject: String(userId),
    expiresIn: env.jwtAccessExpiresIn,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    jwtid: randomUUID(),
  });
};

const createRefreshToken = async (user, familyId, req) => {
  requireEnvironmentValues([['JWT_REFRESH_SECRET', env.jwtRefreshSecret]], 'JWT refresh token');
  const token = jwt.sign({ tokenUse: 'refresh', familyId }, env.jwtRefreshSecret, {
    subject: String(user._id),
    expiresIn: env.jwtRefreshExpiresIn,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    jwtid: randomUUID(),
  });
  const { exp } = jwt.decode(token);
  const session = await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(token),
    familyId,
    expiresAt: new Date(exp * 1000),
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
  });
  return { token, session };
};

const createSessionResponse = async (user, req, familyId = randomUUID()) => {
  const [{ token: refreshToken }, context] = await Promise.all([
    createRefreshToken(user, familyId, req),
    getUserContext(user._id),
  ]);
  return {
    accessToken: createAccessToken(user._id),
    refreshToken,
    user: toPublicUser(user, context),
  };
};

const requirePassword = (password) => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw httpError(400, 'WEAK_PASSWORD', 'Password must contain between 12 and 128 characters.');
  }
};

export const login = async ({ email, password }, req) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash || dummyPasswordHash);
  if (!user || !passwordMatches || !user.isActive) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  user.lastLoginAt = new Date();
  await user.save();
  return createSessionResponse(user, req);
};

export const registerMember = async (input, actorId) => {
  requirePassword(input.password);
  const email = input.email.trim().toLowerCase();
  const existing = await User.exists({ email });
  if (existing) throw httpError(409, 'EMAIL_ALREADY_EXISTS', 'An account with that email already exists.');

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_COST);
  let user;
  try {
    user = await User.create({
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || '',
    });
    const memberRole = await Role.findOne({ name: 'member' }).select('_id');
    if (!memberRole) throw new Error('Member role is not seeded. Run the database seed command first.');
    await Promise.all([
      UserRole.create({ userId: user._id, roleId: memberRole._id, assignedBy: actorId }),
      MemberProfile.create({ userId: user._id }),
    ]);
  } catch (error) {
    if (user) await Promise.all([
      User.deleteOne({ _id: user._id }),
      UserRole.deleteMany({ userId: user._id }),
      MemberProfile.deleteOne({ userId: user._id }),
    ]);
    if (error.code === 11000) throw httpError(409, 'EMAIL_ALREADY_EXISTS', 'An account with that email already exists.');
    throw error;
  }
  return toPublicUser(user, await getUserContext(user._id));
};

export const rotateRefreshToken = async (rawToken, req) => {
  if (!rawToken) throw httpError(401, 'REFRESH_TOKEN_REQUIRED', 'Your session has expired. Sign in again.');
  let payload;
  try {
    payload = jwt.verify(rawToken, env.jwtRefreshSecret, { issuer: env.jwtIssuer, audience: env.jwtAudience });
  } catch {
    throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again.');
  }
  if (payload.tokenUse !== 'refresh' || !payload.familyId) {
    throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again.');
  }

  const session = await RefreshSession.findOne({ tokenHash: hashToken(rawToken) }).select('+tokenHash');
  if (!session || String(session.userId) !== payload.sub || session.familyId !== payload.familyId) {
    throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Your session has expired. Sign in again.');
  }
  if (session.revokedAt) {
    await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw httpError(401, 'REFRESH_TOKEN_REUSE', 'This session is no longer valid. Sign in again.');
  }
  if (session.expiresAt <= new Date()) {
    session.revokedAt = new Date();
    await session.save();
    throw httpError(401, 'REFRESH_TOKEN_EXPIRED', 'Your session has expired. Sign in again.');
  }

  const claimed = await RefreshSession.findOneAndUpdate(
    { _id: session._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );
  if (!claimed) {
    await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw httpError(401, 'REFRESH_TOKEN_REUSE', 'This session is no longer valid. Sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user?.isActive) {
    await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw httpError(401, 'ACCOUNT_INACTIVE', 'This account is not active.');
  }
  const result = await createSessionResponse(user, req, session.familyId);
  const newSession = await RefreshSession.findOne({ tokenHash: hashToken(result.refreshToken) }).select('_id');
  claimed.replacedBy = newSession?._id || null;
  await claimed.save();
  return result;
};

export const logout = async (rawToken) => {
  if (!rawToken) return;
  await RefreshSession.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true });
  if (!user) return;

  const rawToken = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const resetUrl = new URL('/reset-password', env.frontendUrl);
  resetUrl.searchParams.set('token', rawToken);
  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your Impeccables account password',
      text: `Use this one-time link within 30 minutes to reset your password: ${resetUrl.toString()}`,
      html: `<p>Hello ${escapeHtml(user.firstName)},</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`,
    });
  } catch (error) {
    logger.warn('Password reset email was not delivered', { code: error.code || 'SMTP_ERROR' });
  }
};

export const resetPassword = async (rawToken, password) => {
  requirePassword(password);
  if (typeof rawToken !== 'string' || rawToken.length !== 64) {
    throw httpError(400, 'RESET_TOKEN_INVALID', 'This password reset link is invalid or expired.');
  }
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpiresAt: { $gt: new Date() },
    isActive: true,
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) throw httpError(400, 'RESET_TOKEN_INVALID', 'This password reset link is invalid or expired.');

  user.passwordHash = await bcrypt.hash(password, PASSWORD_COST);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  requirePassword(newPassword);
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) {
    throw httpError(400, 'CURRENT_PASSWORD_INCORRECT', 'The current password is incorrect.');
  }
  user.passwordHash = await bcrypt.hash(newPassword, PASSWORD_COST);
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, { issuer: env.jwtIssuer, audience: env.jwtAudience });
    if (payload.tokenUse !== 'access') throw new Error('Wrong token purpose.');
    return payload;
  } catch {
    throw httpError(401, 'INVALID_ACCESS_TOKEN', 'Your session is invalid or expired.');
  }
};

export const revokeAllUserSessions = async (userId) => RefreshSession.updateMany(
  { userId, revokedAt: null },
  { $set: { revokedAt: new Date() } },
);

export { httpError, PASSWORD_COST, REFRESH_COOKIE_NAME };
