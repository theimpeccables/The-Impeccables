import rateLimit from 'express-rate-limit';

const rateLimitResponse = {
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health'),
  message: rateLimitResponse,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse,
});
