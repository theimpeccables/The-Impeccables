import { Router } from 'express';
import { body } from 'express-validator';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  refreshController,
  registerController,
  resetPasswordController,
} from '../controllers/authController.js';

const router = Router();
const emailValidation = body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail();
const passwordValidation = body('password').isString().isLength({ min: 12, max: 128 }).withMessage('Password must contain between 12 and 128 characters.');

router.post('/login', authRateLimiter,
  emailValidation,
  body('password').isString().isLength({ min: 1, max: 128 }).withMessage('Password is required.'),
  validateRequest,
  asyncHandler(loginController));

router.post('/refresh-token', authRateLimiter, asyncHandler(refreshController));
router.post('/logout', authRateLimiter, asyncHandler(logoutController));

router.post('/forgot-password', authRateLimiter,
  emailValidation,
  validateRequest,
  asyncHandler(forgotPasswordController));

router.post('/reset-password', authRateLimiter,
  body('token').isString().isLength({ min: 64, max: 64 }).isHexadecimal().withMessage('The reset token is invalid.'),
  passwordValidation,
  validateRequest,
  asyncHandler(resetPasswordController));

router.put('/change-password', requireAuth,
  body('currentPassword').isString().isLength({ min: 1, max: 128 }),
  body('newPassword').isString().isLength({ min: 12, max: 128 }),
  validateRequest,
  asyncHandler(changePasswordController));

router.post('/register', requireAuth, requirePermission('user:create'), authRateLimiter,
  emailValidation,
  passwordValidation,
  body('firstName').isString().trim().isLength({ min: 2, max: 60 }),
  body('lastName').isString().trim().isLength({ min: 1, max: 60 }),
  body('phone').optional().isString().trim().isLength({ max: 32 }),
  validateRequest,
  asyncHandler(registerController));

export default router;
