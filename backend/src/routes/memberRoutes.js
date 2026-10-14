import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMember,
  getMemberDirectory,
  getMyProfile,
  getPublicTeam,
  listMembers,
  removeMyProfilePhoto,
  updateMember,
  updateMemberStatus,
  updateMyProfile,
  uploadMyProfilePhoto,
  validateMemberId,
} from '../controllers/memberController.js';
import { profilePhotoUpload } from '../middleware/upload.js';

const router = Router();
const name = (field, max) => body(field).optional().isString().trim().isLength({ min: 2, max });

router.get('/public-team', asyncHandler(getPublicTeam));
router.get('/me', requireAuth, asyncHandler(getMyProfile));
router.post('/me/photo', requireAuth, profilePhotoUpload.single('photo'), asyncHandler(uploadMyProfilePhoto));
router.delete('/me/photo', requireAuth, asyncHandler(removeMyProfilePhoto));
router.put('/me', requireAuth,
  name('firstName', 60),
  name('lastName', 60),
  body('phone').optional().isString().trim().isLength({ max: 32 }),
  body('dateOfBirth').optional({ values: 'null' }).isISO8601().toDate(),
  body('rollNumber').optional().isString().trim().isLength({ max: 40 }),
  body('branch').optional().isString().trim().isLength({ max: 100 }),
  body('year').optional({ values: 'null' }).isInt({ min: 1, max: 8 }).toInt(),
  body('skills').optional().isArray({ max: 30 }),
  body('skills.*').optional().isString().trim().isLength({ max: 60 }),
  body('bio').optional().isString().trim().isLength({ max: 1000 }),
  body('domains').optional().isArray({ max: 7 }),
  body('domains.*').optional().isMongoId(),
  body('isPublic').optional().isBoolean().toBoolean(),
  body('portfolioLinks').optional().isObject(),
  body('portfolioLinks.*').optional().isString().trim().isLength({ max: 300 }),
  body('notificationPreferences').optional().isObject(),
  body('notificationPreferences.*').optional().isBoolean().toBoolean(),
  validateRequest,
  asyncHandler(updateMyProfile));

router.get('/directory', requireAuth, asyncHandler(getMemberDirectory));
router.get('/', requireAuth, requirePermission('member:list'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  validateRequest,
  asyncHandler(listMembers));

router.get('/:id', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(getMember));
router.put('/:id', requireAuth, requirePermission('member:manage'), validateMemberId,
  name('firstName', 60),
  name('lastName', 60),
  body('phone').optional().isString().trim().isLength({ max: 32 }),
  body('profilePhoto').optional().isURL({ protocols: ['https'], require_protocol: true }).isLength({ max: 1000 }),
  validateRequest,
  asyncHandler(updateMember));
router.put('/:id/status', requireAuth, requirePermission('member:manage'), validateMemberId,
  body('isActive').isBoolean().toBoolean(), validateRequest, asyncHandler(updateMemberStatus));

export default router;
