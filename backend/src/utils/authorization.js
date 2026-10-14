const ROLE_RANK = Object.freeze({ member: 1, domain_admin: 2, admin: 3, super_admin: 4 });

export const getHighestRole = (roles = []) => roles
  .slice()
  .sort((left, right) => (ROLE_RANK[right] || 0) - (ROLE_RANK[left] || 0))[0] || 'member';

export const hasPermission = (grantedPermissions = [], requiredPermission) =>
  grantedPermissions.includes('*') || grantedPermissions.includes(requiredPermission);

export const isSuperAdmin = (auth) => auth?.roles?.includes('super_admin') || auth?.role === 'super_admin';

export const canAccessDomain = ({ roles = [], domainIds = [], role }, targetDomainId) => {
  if (!targetDomainId || roles.includes('admin') || isSuperAdmin({ roles, role })) return true;
  if (!roles.includes('domain_admin')) return false;
  return domainIds.map(String).includes(String(targetDomainId));
};

export const hasAnyRole = (grantedRoles = [], allowedRoles = []) =>
  allowedRoles.some((role) => grantedRoles.includes(role));
