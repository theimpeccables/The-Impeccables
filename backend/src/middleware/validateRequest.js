import { validationResult } from 'express-validator';

export const validateRequest = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const error = new Error('The submitted data is invalid.');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.details = result.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg }));
  return next(error);
};
