import { Router } from 'express';
import { param, query } from 'express-validator';
import { Notification } from '../models/Notification.js';
import { EmailLog } from '../models/EmailLog.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/notifications', requireAuth, requirePermission('notification:read'), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 }), validateRequest, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Number(req.query.limit) || 20);
  const filter = { recipient: req.auth.userId };
  const [items, total, unread] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Notification.countDocuments(filter), Notification.countDocuments({ ...filter, readAt: null })]);
  return res.json({ success: true, data: { items, unread, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}));
router.patch('/notifications/read-all', requireAuth, requirePermission('notification:read'), asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.auth.userId, readAt: null }, { $set: { readAt: new Date() } });
  return res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
}));
router.patch('/notifications/:id/read', requireAuth, requirePermission('notification:read'), param('id').isMongoId(), validateRequest, asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.auth.userId }, { $set: { readAt: new Date() } }, { new: true });
  if (!item) return res.status(404).json({ success: false, error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' } });
  return res.json({ success: true, data: item });
}));
router.get('/admin/email-logs', requireAuth, requirePermission('email:view_logs'), query('page').optional().isInt({ min: 1 }), validateRequest, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = 50;
  const [items, total] = await Promise.all([EmailLog.find().select('-idempotencyKey').sort({ attemptedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), EmailLog.countDocuments()]);
  return res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}));

export default router;
