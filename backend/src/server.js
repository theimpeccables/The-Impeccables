import { createServer } from 'node:http';
import { assertProductionConfiguration, env } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { startAutomationService } from './services/automationService.js';
import { startTaskReminderService } from './services/taskReminderService.js';

const startServer = async () => {
  assertProductionConfiguration();

  if (env.mongoUri) await connectDB();
  else if (env.nodeEnv === 'production') throw new Error('MONGODB_URI is required in production.');
  else await connectDB();

  const server = createServer(createApp());
  let automation;
  try { automation = await startAutomationService(); }
  catch (error) { logger.error('Background automation could not start', { errorName: error.name, errorMessage: error.message }); }
  const taskReminders = startTaskReminderService();
  server.listen(env.port, () => {
    logger.info('API server listening', { port: env.port, environment: env.nodeEnv });
  });

  server.on('error', (error) => {
    logger.error('API server failed', {
      code: error.code,
      errorMessage: error.message,
      ...(error.code === 'EADDRINUSE' ? { hint: `Port ${env.port} is already in use. Stop the other process or set PORT to an unused port in backend/.env.` } : {}),
    });
    Promise.allSettled([automation?.close(), taskReminders.close(), closeDB()]).finally(() => { process.exitCode = 1; });
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('API server shutting down', { signal });
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async (error) => {
      try {
        await automation?.close();
        await taskReminders.close();
        await closeDB();
        if (error) throw error;
        clearTimeout(forceExit);
        process.exitCode = 0;
      } catch (shutdownError) {
        logger.error('Graceful shutdown failed', { errorMessage: shutdownError.message });
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  return server;
};

startServer().catch((error) => {
  logger.error('API startup failed', { errorName: error.name, errorMessage: error.message });
  process.exitCode = 1;
});
