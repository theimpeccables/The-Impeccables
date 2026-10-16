import { EmailLog } from '../models/EmailLog.js';
import { Notification } from '../models/Notification.js';
import { sendEmail } from '../config/mailer.js';
import { logger } from '../utils/logger.js';

export const createNotification = async ({ recipient, type = 'system', title, message, href = '', relatedModel = '', relatedId = null, dedupeKey }) => {
  if (!recipient || !title || !message) return null;
  if (dedupeKey) return Notification.findOneAndUpdate({ recipient, dedupeKey }, { $setOnInsert: { recipient, dedupeKey, type, title, message, href, relatedModel, relatedId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return Notification.create({ recipient, type, title, message, href, relatedModel, relatedId });
};

export const sendTrackedEmail = async ({ to, subject, text, html, replyTo, cc, idempotencyKey, template = 'general' }) => {
  if (!idempotencyKey) throw new TypeError('Tracked email requires an idempotency key.');
  let log;
  try {
    log = await EmailLog.create({ idempotencyKey, recipient: to, template, subject, attempts: 1, status: 'processing', attemptedAt: new Date() });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await EmailLog.findOne({ idempotencyKey });
    if (existing?.status === 'sent') return { alreadySent: true, messageId: existing.providerMessageId };
    const retryBefore = new Date(Date.now() - 2 * 60 * 1000);
    log = await EmailLog.findOneAndUpdate(
      { idempotencyKey, $or: [{ status: 'failed' }, { status: 'processing', attemptedAt: { $lt: retryBefore } }] },
      { $set: { status: 'processing', attemptedAt: new Date(), lastErrorCode: '' }, $inc: { attempts: 1 } },
      { new: true },
    );
    if (!log) return { inProgress: true };
  }
  try {
    const result = await sendEmail({ to, subject, text, html, replyTo, cc });
    await EmailLog.updateOne({ _id: log._id }, { $set: { status: 'sent', providerMessageId: result.messageId, sentAt: new Date(), lastErrorCode: '' } });
    return { alreadySent: false, messageId: result.messageId };
  } catch (error) {
    await EmailLog.updateOne({ _id: log._id }, { $set: { status: 'failed', lastErrorCode: String(error.code || 'SMTP_DELIVERY_FAILED').slice(0, 100) } });
    logger.warn('Tracked email delivery failed', { template, errorCode: error.code || 'SMTP_DELIVERY_FAILED' });
    throw error;
  }
};
