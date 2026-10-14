import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assignTask, assignVolunteer, autoAssignTask, cancelVolunteerSignup, createTask, createVolunteerSlot, listTasks, listVolunteerRoster, listVolunteerSlots, signupVolunteer, updateTaskStatus } from '../controllers/operationsController.js';

const router = Router();
router.get('/tasks', requireAuth, query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('status').optional().isIn(['all', 'open', 'assigned', 'accepted', 'in_progress', 'blocked', 'completed', 'cancelled']), validateRequest, asyncHandler(listTasks));
router.post('/tasks', requireAuth, requirePermission('task:create'), body('title').isString().trim().isLength({ min: 2, max: 180 }), body('description').optional().isString().trim().isLength({ max: 5000 }), body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']), body('domainId').optional().isString().trim(), body('associatedEvent').optional().isMongoId(), body('deadline').optional().isISO8601().toDate(), validateRequest, asyncHandler(createTask));
router.post('/tasks/:id/assign', requireAuth, requirePermission('task:assign'), param('id').isMongoId(), body('userIds').isArray({ min: 1, max: 100 }), body('userIds.*').isMongoId(), validateRequest, asyncHandler(assignTask));
router.post('/tasks/:id/auto-assign', requireAuth, requirePermission('task:auto_assign'), param('id').isMongoId(), validateRequest, asyncHandler(autoAssignTask));
router.patch('/tasks/:id/status', requireAuth, requirePermission('task:update_status'), param('id').isMongoId(), body('status').isIn(['accepted', 'declined', 'in_progress', 'blocked', 'completed']), body('note').optional().isString().trim().isLength({ max: 1000 }), validateRequest, asyncHandler(updateTaskStatus));
router.post('/events/:eventId/volunteer-slots', requireAuth, requirePermission('volunteer:manage_slots'), param('eventId').isMongoId(), body('title').isString().trim().isLength({ min: 2, max: 160 }), body('description').optional().isString().trim().isLength({ max: 1000 }), body('domainId').optional().isString().trim(), body('startsAt').isISO8601().toDate(), body('endsAt').isISO8601().toDate(), body('capacity').isInt({ min: 1, max: 1000 }).toInt(), validateRequest, asyncHandler(createVolunteerSlot));
router.get('/events/:eventId/volunteer-slots', param('eventId').isMongoId(), validateRequest, asyncHandler(listVolunteerSlots));
router.get('/events/:eventId/volunteer-roster', requireAuth, requirePermission('volunteer:view_roster'), param('eventId').isMongoId(), validateRequest, asyncHandler(listVolunteerRoster));
router.post('/volunteer-slots/:slotId/signup', requireAuth, requirePermission('volunteer:signup'), param('slotId').isMongoId(), validateRequest, asyncHandler(signupVolunteer));
router.delete('/volunteer-assignments/:assignmentId', requireAuth, param('assignmentId').isMongoId(), validateRequest, asyncHandler(cancelVolunteerSignup));
router.post('/volunteer-slots/:slotId/assign', requireAuth, requirePermission('volunteer:assign'), param('slotId').isMongoId(), body('userId').isMongoId(), validateRequest, asyncHandler(assignVolunteer));

export default router;
