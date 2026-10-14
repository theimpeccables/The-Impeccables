import { Router } from 'express';
import { param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPublicDomain, listPublicDomains } from '../controllers/domainController.js';

const router = Router();
router.get('/', asyncHandler(listPublicDomains));
router.get('/:slug', param('slug').isSlug().withMessage('Domain slug is invalid.'), validateRequest, asyncHandler(getPublicDomain));

export default router;
