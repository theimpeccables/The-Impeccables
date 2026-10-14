import { AuditLog } from '../models/AuditLog.js';

const blockedKeys = /password|token|secret|cookie|authorization|emailBody|raw/i;
const sanitize = (value) => {
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !blockedKeys.test(key)).slice(0, 50).map(([key, item]) => [key, sanitize(item)]));
};

export const recordAudit = (req, { action, resourceType, resourceId, metadata = {} }) => AuditLog.create({
  actor: req.auth?.userId || null,
  action,
  resourceType,
  resourceId: resourceId || null,
  requestId: req.requestId || '',
  ip: String(req.ip || '').slice(0, 80),
  userAgent: String(req.get?.('user-agent') || '').slice(0, 300),
  metadata: sanitize(metadata),
});
