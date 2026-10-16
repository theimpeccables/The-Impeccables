import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import domainRoutes from './routes/domainRoutes.js';
import publicContentRoutes from './routes/publicContentRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import taskWorkflowRoutes from './routes/taskWorkflowRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import birthdayRoutes from './routes/birthdayRoutes.js';
import { getAutomationHealth } from './services/automationService.js';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  // API responses contain live approval and publication state. Avoid browser
  // revalidation returning stale 304 bodies after content is published.
  app.disable('etag');
  if (env.nodeEnv === 'production') app.set('trust proxy', 1);

  app.use((req, res, next) => {
    const providedId = req.get('x-request-id');
    req.requestId = providedId && /^[A-Za-z0-9._:-]{1,80}$/.test(providedId) ? providedId : randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  const mediaOrigins = [...new Set(["'self'", ...env.corsOrigins, 'https:'])];
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: mediaOrigins,
      connectSrc: ["'self'", ...env.corsOrigins],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      upgradeInsecureRequests: env.nodeEnv === 'production' ? [] : null,
    } },
  }));
  app.use(cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      const error = new Error('This origin is not allowed by the API CORS policy.');
      error.statusCode = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      return callback(error);
    },
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(cookieParser());
  app.use(morgan(':method :status :response-time ms :res[content-length]', {
    stream: { write: (line) => logger.info(line.trim()) },
  }));
  app.use(env.apiPrefix, apiRateLimiter);
  app.use(env.apiPrefix, (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get(`${env.apiPrefix}/health`, (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        service: 'theimpeccables-api',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get(`${env.apiPrefix}/health/ready`, (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
      success: databaseReady,
      data: { status: databaseReady ? 'ready' : 'not_ready', database: databaseReady ? 'connected' : 'disconnected' },
    });
  });
  app.get(`${env.apiPrefix}/health/jobs`, (_req, res) => res.json({ success: true, data: getAutomationHealth() }));

  app.use(`${env.apiPrefix}/auth`, authRoutes);
  app.use(`${env.apiPrefix}/members`, memberRoutes);
  app.use(`${env.apiPrefix}/groups`, groupRoutes);
  app.use(`${env.apiPrefix}/automation/birthdays`, birthdayRoutes);
  app.use(`${env.apiPrefix}/roles`, roleRoutes);
  app.use(`${env.apiPrefix}/domains`, domainRoutes);
  // New task workflow routes must run before the legacy task handlers.
  app.use(`${env.apiPrefix}`, taskWorkflowRoutes);
  app.use(`${env.apiPrefix}`, operationsRoutes);
  app.use(`${env.apiPrefix}`, attendanceRoutes);
  app.use(`${env.apiPrefix}`, notificationRoutes);
  app.use(`${env.apiPrefix}`, adminRoutes);
  app.use(`${env.apiPrefix}`, contentRoutes);
  app.use(`${env.apiPrefix}`, publicContentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

export default createApp;
