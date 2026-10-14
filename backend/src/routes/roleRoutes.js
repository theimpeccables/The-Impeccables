import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assignRole, listRoles, revokeRole } from '../controllers/roleController.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('role:manage'), asyncHandler(listRoles));
router.post('/:userId/assign', requirePermission('role:assign'),
  body('role').isIn(['member', 'domain_admin', 'admin', 'super_admin']),
  body('domainIds').optional().isArray({ min: 1, max: 7 }),
  body('domainIds.*').optional().isMongoId(),
  validateRequest,
  asyncHandler(assignRole));
router.delete('/:userId/revoke', requirePermission('role:revoke'),
  body('role').isIn(['member', 'domain_admin', 'admin', 'super_admin']),
  validateRequest,
  asyncHandler(revokeRole));

export default router;
