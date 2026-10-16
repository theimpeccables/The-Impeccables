import 'dotenv/config';

const parseBoolean = (value, name, fallback) => {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either "true" or "false".`);
};

const parsePort = (value) => {
  const port = Number(value || 5001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
};

const parsePositiveInteger = (value, name, fallback) => {
  const number = Number(value || fallback);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return number;
};

const parseSameSite = (value) => {
  const sameSite = value || 'lax';
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  if (sameSite === 'none' && !parseBoolean(process.env.COOKIE_SECURE, 'COOKIE_SECURE', process.env.NODE_ENV === 'production')) {
    throw new Error('COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none.');
  }
  return sameSite;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  apiPrefix: process.env.API_PREFIX || '/api',
  mongoUri: process.env.MONGODB_URI || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'theimpeccables-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'theimpeccables-web',
  cookieSecure: parseBoolean(process.env.COOKIE_SECURE, 'COOKIE_SECURE', process.env.NODE_ENV === 'production'),
  cookieSameSite: parseSameSite(process.env.COOKIE_SAME_SITE),
  cloudinary: Object.freeze({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  }),
  uploads: Object.freeze({ maxBytes: parsePositiveInteger(process.env.MAX_UPLOAD_BYTES, 'MAX_UPLOAD_BYTES', 52428800) }),
  smtp: Object.freeze({
    host: process.env.SMTP_HOST || '',
    port: parsePort(process.env.SMTP_PORT || '587'),
    secure: parseBoolean(process.env.SMTP_SECURE, 'SMTP_SECURE', false),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '',
  }),
  contactEmail: process.env.CONTACT_EMAIL || '',
  redisUrl: process.env.REDIS_URL || '',
  cronSecret: process.env.CRON_SECRET || '',
  birthdayDailyCap: parsePositiveInteger(process.env.BIRTHDAY_DAILY_CAP, 'BIRTHDAY_DAILY_CAP', 300),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || '',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',
});

export const assertProductionConfiguration = () => {
  if (env.nodeEnv !== 'production') return;

  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (env.jwtAccessSecret.length < 32) missing.push('JWT_ACCESS_SECRET (at least 32 characters)');
  if (env.jwtRefreshSecret.length < 32) missing.push('JWT_REFRESH_SECRET (at least 32 characters)');
  if (env.jwtAccessSecret && env.jwtAccessSecret === env.jwtRefreshSecret) {
    missing.push('distinct JWT access and refresh secrets');
  }
  if (!env.cookieSecure) missing.push('COOKIE_SECURE=true');
  if (env.corsOrigins.includes('*')) missing.push('an explicit CORS_ORIGINS allowlist');
  if (missing.length) {
    throw new Error(`Invalid production configuration: ${missing.join(', ')}.`);
  }
};

export const requireEnvironmentValues = (values, integrationName) => {
  const missing = values.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    const error = new Error(`${integrationName} is not configured. Missing: ${missing.join(', ')}.`);
    error.code = 'INTEGRATION_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }
};
