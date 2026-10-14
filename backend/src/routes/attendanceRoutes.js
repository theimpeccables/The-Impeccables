import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { completeMeeting, createMeeting, getAttendanceReport, getMeetingDetail, getMyAttendance, listMeetings, markAllPresent, markAttendance, saveFinalAttendance, saveMeetingAgenda, saveMeetingConclusion, saveMeetingResponse, updateMeeting } from '../controllers/attendanceController.js';

const router = Router();
router.get('/meetings', requireAuth, asyncHandler(listMeetings));
router.get('/meetings/:meetingId', requireAuth, param('meetingId').isMongoId(), validateRequest, asyncHandler(getMeetingDetail));
router.put('/meetings/:meetingId/response', requireAuth, param('meetingId').isMongoId(), body('status').isIn(['attending', 'not_attending']), body('reason').if((value, { req }) => req.body.status === 'not_attending').isString().trim().isLength({ min: 1, max: 500 }), body('reason').optional().isString().trim().isLength({ max: 500 }), validateRequest, asyncHandler(saveMeetingResponse));
router.post('/meetings', requireAuth,
  body('title').isString().trim().isLength({ min: 2, max: 180 }), body('agenda').optional().isString().trim().isLength({ max: 12000 }), body('date').isISO8601().toDate(),
  body('endTime').optional({ values: 'falsy' }).isISO8601(), body('venue').optional().isString().trim().isLength({ max: 500 }), body('meetingLink').optional().isString().trim().isLength({ max: 2048 }),
  body('groupIds').isArray({ min: 1, max: 50 }), body('groupIds.*').isMongoId(), body('organizerId').optional().isMongoId(), validateRequest, asyncHandler(createMeeting));
router.patch('/meetings/:meetingId', requireAuth, param('meetingId').isMongoId(), body('title').optional().isString().trim().isLength({ min: 2, max: 180 }), body('date').optional().isISO8601().toDate(), body('endTime').optional({ values: 'falsy' }).isISO8601(), body('venue').optional().isString().trim().isLength({ max: 500 }), body('meetingLink').optional().isString().trim().isLength({ max: 2048 }), body('agenda').optional().isString().trim().isLength({ max: 12000 }), body('organizerId').optional().isMongoId(), body('status').optional().isIn(['cancelled']), body('isActive').optional().isBoolean().toBoolean(), validateRequest, asyncHandler(updateMeeting));
router.patch('/meetings/:meetingId/agenda', requireAuth, param('meetingId').isMongoId(), body('agenda').isString().isLength({ max: 12000 }), validateRequest, asyncHandler(saveMeetingAgenda));
router.patch('/meetings/:meetingId/conclusion', requireAuth, param('meetingId').isMongoId(), body('conclusion').optional({ values: 'null' }).isString().isLength({ max: 12000 }), validateRequest, asyncHandler(saveMeetingConclusion));
router.put('/meetings/:meetingId/attendance/:userId', requireAuth, param('meetingId').isMongoId(), param('userId').isMongoId(), body('status').isIn(['present', 'absent', 'excused']), body('note').optional().isString().trim().isLength({ max: 200 }), validateRequest, asyncHandler(saveFinalAttendance));
router.post('/meetings/:meetingId/attendance/mark-all-present', requireAuth, param('meetingId').isMongoId(), validateRequest, asyncHandler(markAllPresent));
router.post('/meetings/:meetingId/complete', requireAuth, param('meetingId').isMongoId(), body('confirm').optional().isBoolean(), validateRequest, asyncHandler(completeMeeting));
router.post('/meetings/:meetingId/attendance', requireAuth, requirePermission('attendance:mark'), param('meetingId').isMongoId(), body('records').isArray({ min: 1, max: 1000 }), body('records.*.userId').isMongoId(), body('records.*.status').isIn(['present', 'absent', 'excused']), body('records.*.notes').optional().isString().trim().isLength({ max: 200 }), validateRequest, asyncHandler(markAttendance));
router.get('/meetings/:meetingId/report', requireAuth, param('meetingId').isMongoId(), validateRequest, asyncHandler(getAttendanceReport));
router.get('/attendance/me', requireAuth, requirePermission('attendance:view_own'), asyncHandler(getMyAttendance));

export default router;
