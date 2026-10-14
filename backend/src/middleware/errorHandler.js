import { logger } from '../utils/logger.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} was not found.` },
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  let statusCode = Number(error.statusCode || error.status || 500);
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'An unexpected error occurred.';
  let details = error.details;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'The submitted data is invalid.';
    details = Object.values(error.errors || {}).map(({ path, message: detail }) => ({ field: path, message: detail }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'A supplied identifier is invalid.';
  } else if (error.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_VALUE';
    message = 'A record with that value already exists.';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'The request body contains invalid JSON.';
  }

  if (statusCode >= 500) {
    logger.error('Request failed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      errorName: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : message;
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(req.requestId ? { requestId: req.requestId } : {}),
    },
  });
};
