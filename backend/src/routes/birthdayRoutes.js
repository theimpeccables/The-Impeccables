import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  birthdayLogs, birthdayPreview, birthdayRunDue, birthdayRunNow, birthdayStatus,
  birthdayTest, readBirthdaySettings, resendBirthdayLog, saveBirthdaySettings, upcomingBirthdays,
} from '../controllers/birthdayController.js';

const router = Router();
const adminRead = [requireAuth, requireRole('admin', 'super_admin')];
const superAdmin = [requireAuth, requireRole('super_admin')];
const text = (field, max) => body(field).optional().isString().isLength({ max });

router.post('/run-due', asyncHandler(birthdayRunDue));
router.get('/settings', ...adminRead, asyncHandler(readBirthdaySettings));
router.put('/settings', ...superAdmin,
  body('enabled').optional().isBoolean().toBoolean(),
  body('sendTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('timezone').optional().isString().trim().isLength({ min: 1, max: 80 }),
  body('subject').optional().isString().trim().isLength({ min: 1, max: 180 }),
  text('bodyHtml', 20000), text('bodyText', 20000),
  body('templateVariables').optional().isArray({ max: 5 }),
  body('templateVariables.*').optional().isIn(['firstName', 'fullName', 'domain', 'clubName', 'year']),
  body('includeClubSignature').optional().isBoolean().toBoolean(), body('ccAdmins').optional().isBoolean().toBoolean(), body('notifyInApp').optional().isBoolean().toBoolean(),
  validateRequest, asyncHandler(saveBirthdaySettings));
router.get('/status', ...adminRead, asyncHandler(birthdayStatus));
router.get('/upcoming', requireAuth, query('days').optional().isIn(['7', '30', '60']), validateRequest, asyncHandler(upcomingBirthdays));
router.get('/logs', ...adminRead,
  query('page').optional().isInt({ min: 1 }).toInt(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['sent', 'failed', 'skipped', 'queued']),
  query('from').optional().isISO8601({ strict: true, strictSeparator: true }), query('to').optional().isISO8601({ strict: true, strictSeparator: true }),
  query('q').optional().isString().trim().isLength({ max: 100 }), validateRequest, asyncHandler(birthdayLogs));
router.post('/preview', ...adminRead, text('subject', 180), text('bodyHtml', 20000), text('bodyText', 20000), body('includeClubSignature').optional().isBoolean().toBoolean(), validateRequest, asyncHandler(birthdayPreview));
router.post('/test', ...superAdmin, asyncHandler(birthdayTest));
router.post('/run-now', ...superAdmin, asyncHandler(birthdayRunNow));
router.post('/resend/:logId', ...superAdmin, param('logId').isMongoId(), validateRequest, asyncHandler(resendBirthdayLog));

export default router;
