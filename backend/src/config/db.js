import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConfigured = false;

export const connectDB = async () => {
  if (!env.mongoUri) {
    logger.warn('MONGODB_URI is not set; database-backed routes will not be ready.');
    return false;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      autoIndex: env.nodeEnv !== 'production',
    });
    isConfigured = true;
    logger.info('MongoDB connection established', { database: mongoose.connection.name });
    return true;
  } catch (error) {
    logger.error('MongoDB connection failed', { errorName: error.name, errorMessage: error.message });
    throw error;
  }
};

export const closeDB = async () => {
  if (isConfigured || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConfigured = false;
    logger.info('MongoDB connection closed');
  }
};

mongoose.connection.on('disconnected', () => logger.warn('MongoDB connection lost'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB connection restored'));

export default connectDB;
