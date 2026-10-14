import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { contentUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createDraft, decideApproval, listApprovalQueue, listMyPosts, moderatePost,
  publishPost, submitDraft, updateDraft, uploadPostMedia,
} from '../controllers/contentController.js';

const router = Router();
router.get('/posts/mine', requireAuth, requirePermission('post:create'), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 }), validateRequest, asyncHandler(listMyPosts));
router.post('/posts', requireAuth, requirePermission('post:create'),
  body('title').isString().trim().isLength({ min: 2, max: 180 }),
  body('domainId').isString().trim().notEmpty(),
  body('contentType').isIn(['artwork', 'photography', 'reel', 'video', 'article', 'poster', 'event_coverage']),
  body('description').optional().isString().trim().isLength({ max: 3000 }),
  body('tags').optional().isArray({ max: 20 }), body('tags.*').optional().isString().trim().isLength({ max: 40 }),
  body('articleContent').optional().isString().isLength({ max: 100000 }),
  body('associatedEvent').optional({ values: 'falsy' }).isMongoId(),
  validateRequest, asyncHandler(createDraft));
router.put('/posts/:id', requireAuth, requirePermission('post:edit_own'), param('id').isMongoId(), validateRequest, asyncHandler(updateDraft));
router.post('/posts/:id/media', requireAuth, requirePermission('post:create'), param('id').isMongoId(), contentUpload.single('media'), asyncHandler(uploadPostMedia));
router.post('/posts/:id/submit', requireAuth, requirePermission('post:submit'), param('id').isMongoId(), validateRequest, asyncHandler(submitDraft));
router.get('/approvals', requireAuth, requirePermission('approval:view_queue'), asyncHandler(listApprovalQueue));
router.post('/approvals/:id/decision', requireAuth, requirePermission('approval:decide'), param('id').isMongoId(),
  body('decision').isIn(['approved', 'rejected', 'changes_requested']),
  body('comments').optional().isString().trim().isLength({ max: 3000 }),
  validateRequest, asyncHandler(decideApproval));
router.post('/posts/:id/publish', requireAuth, requirePermission('approval:publish'), param('id').isMongoId(), validateRequest, asyncHandler(publishPost));
router.patch('/posts/:id/publish', requireAuth, requirePermission('content:moderate'), param('id').isMongoId(), body('published').isBoolean().toBoolean(), validateRequest, asyncHandler(moderatePost));

export default router;
