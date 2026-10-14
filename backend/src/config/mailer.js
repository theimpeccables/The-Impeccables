import nodemailer from 'nodemailer';
import { env, requireEnvironmentValues } from './env.js';

let transporter;

const getTransporter = () => {
  requireEnvironmentValues([
    ['SMTP_HOST', env.smtp.host],
    ['SMTP_USER', env.smtp.user],
    ['SMTP_PASS', env.smtp.password],
    ['EMAIL_FROM', env.smtp.from],
  ], 'SMTP email');

  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  if (!to || !subject || (!text && !html)) {
    throw new TypeError('Email requires a recipient, subject, and text or HTML body.');
  }
  const result = await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
    replyTo,
  });
  return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
};

export const verifyEmailTransport = async () => getTransporter().verify();

export default sendEmail;
