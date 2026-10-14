import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const backfillMemberSearchFields = async () => {
  const result = await User.updateMany(
    { $or: [{ firstNameSearch: { $exists: false } }, { lastNameSearch: { $exists: false } }] },
    [{ $set: {
      firstNameSearch: { $toLower: { $ifNull: ['$firstName', ''] } },
      lastNameSearch: { $toLower: { $ifNull: ['$lastName', ''] } },
    } }],
  );
  logger.info('Member search fields backfilled', { updated: result.modifiedCount });
  return result.modifiedCount;
};

export const ensureMemberSearchIndexes = async () => {
  await backfillMemberSearchFields();
  await User.createIndexes();
  logger.info('Member search indexes are ready');
};
