import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { taskUpload } from '../middleware/taskUpload.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  approveAllWorkflowSubmissions, closeWorkflowTask, commentOnWorkflowTask, createWorkflowTask, deleteWorkflowTask,
  getWorkflowTask, listTaskGroupMembers, listWorkflowTasks, remindWorkflowTask, reviewWorkflowSubmission,
  reassignWorkflowTask, submitWorkflowTask, updateWorkflowTask, withdrawWorkflowSubmission,
} from '../controllers/taskWorkflowController.js';

const router = Router();
router.get('/tasks', requireAuth, asyncHandler(listWorkflowTasks));
router.get('/tasks/groups/:groupId/members', requireAuth, param('groupId').isMongoId(), validateRequest, asyncHandler(listTaskGroupMembers));
router.post('/tasks', requireAuth,
  body('title').isString().trim().isLength({ min: 2, max: 180 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('groupId').optional({ nullable: true }).isMongoId(),
  body('dueAt').isISO8601(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('requiresSubmission').optional().isBoolean(),
  body('userIds').optional().isArray({ max: 500 }),
  body('userIds.*').optional().isMongoId(),
  validateRequest, asyncHandler(createWorkflowTask));
router.get('/tasks/:id', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(getWorkflowTask));
router.patch('/tasks/:id', requireAuth, param('id').isMongoId(), body('title').optional().isString().trim().isLength({ min: 2, max: 180 }), body('description').optional().isString().isLength({ max: 5000 }), body('groupId').optional({ nullable: true }).isMongoId(), body('dueAt').optional().isISO8601(), body('priority').optional().isIn(['low', 'medium', 'high']), body('status').optional().isIn(['open', 'closed', 'cancelled']), body('requiresSubmission').optional().isBoolean(), body('submissionTypeHint').optional().isString().isLength({ max: 160 }), validateRequest, asyncHandler(updateWorkflowTask));
router.delete('/tasks/:id', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(deleteWorkflowTask));
router.put('/tasks/:id/assignees', requireAuth, param('id').isMongoId(), body('userIds').isArray({ min: 1, max: 500 }), body('userIds.*').isMongoId(), validateRequest, asyncHandler(reassignWorkflowTask));
router.post('/tasks/:id/submissions', requireAuth, param('id').isMongoId(), taskUpload.array('files', 5), validateRequest, asyncHandler(submitWorkflowTask));
router.post('/tasks/:id/submissions/withdraw', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(withdrawWorkflowSubmission));
router.post('/tasks/:id/submissions/:userId/review', requireAuth, param('id').isMongoId(), param('userId').isMongoId(), body('status').isIn(['approved', 'changes_requested']), body('reviewComment').optional().isString().isLength({ max: 3000 }), validateRequest, asyncHandler(reviewWorkflowSubmission));
router.post('/tasks/:id/submissions/approve-all', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(approveAllWorkflowSubmissions));
router.post('/tasks/:id/comments', requireAuth, param('id').isMongoId(), body('body').isString().trim().isLength({ min: 1, max: 3000 }), validateRequest, asyncHandler(commentOnWorkflowTask));
router.post('/tasks/:id/remind', requireAuth, param('id').isMongoId(), validateRequest, asyncHandler(remindWorkflowTask));
router.post('/tasks/:id/close', requireAuth, param('id').isMongoId(), body('status').isIn(['closed', 'cancelled']), validateRequest, asyncHandler(closeWorkflowTask));
// Retired workflow endpoints cannot be used to change submissions or bypass per-task permissions.
router.post('/tasks/:id/assign', requireAuth, (_req, res) => res.status(410).json({ success: false, error: { code: 'TASK_ASSIGNMENT_RETIRED', message: 'Set assignees when creating the task or use the super admin reassignment action.' } }));
router.post('/tasks/:id/auto-assign', requireAuth, (_req, res) => res.status(410).json({ success: false, error: { code: 'TASK_ASSIGNMENT_RETIRED', message: 'Automatic assignment is no longer available.' } }));
router.patch('/tasks/:id/status', requireAuth, (_req, res) => res.status(410).json({ success: false, error: { code: 'TASK_STATUS_RETIRED', message: 'Task progress is tracked through submissions.' } }));

export default router;
