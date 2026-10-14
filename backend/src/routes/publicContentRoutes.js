import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getPublicEvent, getPublicPost, listPublicAchievements, listPublicAnnouncements,
  listPublicEvents, listPublicPosts, listPublicTeam, submitContactMessage, getPublicSitemap,
} from '../controllers/publicContentController.js';

const router = Router();
router.get('/sitemap.xml', asyncHandler(getPublicSitemap));
const paginationValidation = [query('page').optional().isInt({ min: 1, max: 100000 }), query('limit').optional().isInt({ min: 1, max: 50 })];
router.get('/posts', ...paginationValidation, query('domain').optional().isSlug(), validateRequest, asyncHandler(listPublicPosts));
router.get('/posts/:slug', param('slug').isSlug(), validateRequest, asyncHandler(getPublicPost));
router.get('/events', ...paginationValidation, query('upcoming').optional().isBoolean(), query('past').optional().isBoolean(), validateRequest, asyncHandler(listPublicEvents));
router.get('/events/:slug', param('slug').isSlug(), validateRequest, asyncHandler(getPublicEvent));
router.get('/announcements', ...paginationValidation, validateRequest, asyncHandler(listPublicAnnouncements));
router.get('/achievements', ...paginationValidation, validateRequest, asyncHandler(listPublicAchievements));
router.get('/team', asyncHandler(listPublicTeam));
router.post('/contact', authRateLimiter,
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('rollNo').optional().isString().trim().isLength({ max: 80 }),
  body('domainInterest').optional().isString().trim().isLength({ max: 100 }),
  body('message').isString().trim().isLength({ min: 10, max: 5000 }),
  validateRequest,
  asyncHandler(submitContactMessage));

export default router;
