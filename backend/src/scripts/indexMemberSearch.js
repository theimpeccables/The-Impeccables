import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, closeDB } from '../config/db.js';
import { ensureMemberSearchIndexes } from '../services/memberSearchIndexService.js';
import { logger } from '../utils/logger.js';

const run = async () => {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required to prepare member search indexes.');
  await connectDB();
  await ensureMemberSearchIndexes();
};

run()
  .catch((error) => {
    logger.error('Member search index setup failed', { errorName: error.name, errorMessage: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await closeDB();
  });
