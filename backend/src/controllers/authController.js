import { matchedData } from 'express-validator';
import {
  changePassword,
  clearRefreshCookieOptions,
  login,
  logout,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  registerMember,
  requestPasswordReset,
  resetPassword,
  rotateRefreshToken,
} from '../services/authService.js';

const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
export const loginController = async (req, res) => {
  const result = await login(matchedData(req, { locations: ['body'] }), req);
  setRefreshCookie(res, result.refreshToken);
  return res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
};

export const refreshController = async (req, res) => {
  const result = await rotateRefreshToken(req.cookies[REFRESH_COOKIE_NAME], req);
  setRefreshCookie(res, result.refreshToken);
  return res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
};

export const logoutController = async (req, res) => {
  await logout(req.cookies[REFRESH_COOKIE_NAME]);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  return res.status(204).end();
};

export const forgotPasswordController = async (req, res) => {
  await requestPasswordReset(matchedData(req, { locations: ['body'] }).email);
  return res.status(202).json({
    success: true,
    data: { message: 'If an active account matches that email, password reset instructions will be sent.' },
  });
};

export const resetPasswordController = async (req, res) => {
  const { token, password } = matchedData(req, { locations: ['body'] });
  await resetPassword(token, password);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  return res.status(200).json({ success: true, data: { message: 'Password updated. Sign in with your new password.' } });
};

export const changePasswordController = async (req, res) => {
  const { currentPassword, newPassword } = matchedData(req, { locations: ['body'] });
  await changePassword(req.auth.userId, currentPassword, newPassword);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  return res.status(200).json({ success: true, data: { message: 'Password updated. Sign in again.' } });
};

export const registerController = async (req, res) => {
  const member = await registerMember(matchedData(req, { locations: ['body'] }), req.auth.userId);
  return res.status(201).json({ success: true, data: { member } });
};

