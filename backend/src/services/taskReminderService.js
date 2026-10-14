import cron from 'node-cron';
import { Task } from '../models/Task.js';
import { TaskAssignment } from '../models/TaskAssignment.js';
import { TaskSubmission } from '../models/TaskSubmission.js';
import { GroupMembership } from '../models/GroupMembership.js';
import { createNotification } from './notificationService.js';
import { logger } from '../utils/logger.js';

export const sendUpcomingTaskReminders = async (now = new Date()) => {
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasks = await Task.find({ status: { $in: ['open', 'assigned', 'accepted', 'in_progress', 'blocked'] }, $or: [{ dueAt: { $gte: windowStart, $lte: windowEnd } }, { dueAt: null, deadline: { $gte: windowStart, $lte: windowEnd } }] }).select('title dueAt deadline groupId assignWholeGroup organizerId createdBy').lean();
  for (const task of tasks) {
    if (task.groupId && task.assignWholeGroup !== false) {
      const members = await GroupMembership.find({ groupId: task.groupId }).distinct('userId');
      if (members.length) await TaskAssignment.bulkWrite(members.map((userId) => ({
        updateOne: {
          filter: { taskId: task._id, userId },
          update: { $setOnInsert: { taskId: task._id, userId, assignedBy: task.organizerId || task.createdBy, status: 'assigned' } },
          upsert: true,
        },
      })), { ordered: false });
    }
    const [assigned, submitted] = await Promise.all([
      TaskAssignment.find({ taskId: task._id, status: { $ne: 'declined' } }).distinct('userId'),
      TaskSubmission.find({ taskId: task._id, status: { $ne: 'withdrawn' } }).distinct('userId'),
    ]);
    const done = new Set(submitted.map(String));
    const due = new Date(task.dueAt || task.deadline).toLocaleString();
    await Promise.all(assigned.filter((userId) => !done.has(String(userId))).map((recipient) => createNotification({
      recipient,
      type: 'task',
      title: `Task reminder: ${task.title}`,
      message: `This task is due in about 24 hours (${due}).`,
      href: `/tasks/${task._id}`,
      relatedModel: 'Task',
      relatedId: task._id,
      dedupeKey: `task-reminder-24h:${task._id}:${new Date(task.dueAt || task.deadline).getTime()}:${recipient}`,
    })));
  }
};

export const startTaskReminderService = () => {
  const run = () => sendUpcomingTaskReminders().catch((error) => logger.error('Task reminder run failed', { errorName: error.name, errorMessage: error.message }));
  const schedule = cron.schedule('*/15 * * * *', run, { timezone: 'Asia/Kolkata' });
  run();
  return { close: async () => schedule.stop() };
};
