import { User } from '../models/User.js';
import { Domain } from '../models/Domain.js';
import { getUserContext, verifyAccessToken } from '../services/authService.js';
import { canAccessDomain, hasAnyRole, hasPermission, isSuperAdmin } from '../utils/authorization.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const authorizationError = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token, extra] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    throw authorizationError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw authorizationError(401, 'ACCOUNT_INACTIVE', 'This account is unavailable.');
  }
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw authorizationError(401, 'SESSION_REVOKED', 'Your password changed. Sign in again.');
  }

  const context = await getUserContext(user._id);
  req.user = user;
  req.auth = {
    userId: String(user._id),
    role: context.role,
    roles: context.roles,
    permissions: context.permissions,
    domainIds: context.domainIds,
  };
  next();
});

export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.auth || (!isSuperAdmin(req.auth) && !hasPermission(req.auth.permissions, permission))) {
    return next(authorizationError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  }
  return next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth || (!isSuperAdmin(req.auth) && !hasAnyRole(req.auth.roles, roles))) {
    return next(authorizationError(403, 'FORBIDDEN', 'Your role does not allow this action.'));
  }
  return next();
};

export const requireDomainScope = ({ param = 'domainId', body = 'domainId', query = 'domainId' } = {}) => asyncHandler(async (req, _res, next) => {
  const provided = req.params[param] || req.body?.[body] || req.query?.[query];
  if (!provided) return next();

  const identifier = typeof provided === 'object' ? provided._id || provided.id || provided.slug : provided;
  const domain = /^[a-f\d]{24}$/i.test(String(identifier))
    ? await Domain.findById(identifier).select('_id')
    : await Domain.findOne({ slug: String(identifier).toLowerCase() }).select('_id');
  if (!domain) return next(authorizationError(404, 'DOMAIN_NOT_FOUND', 'The requested domain was not found.'));
  if (!canAccessDomain(req.auth, domain._id)) {
    return next(authorizationError(403, 'DOMAIN_SCOPE_FORBIDDEN', 'You cannot access this domain.'));
  }
  req.domain = domain;
  return next();
});
