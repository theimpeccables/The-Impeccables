import multer from 'multer';
import { env } from '../config/env.js';

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']);
export const contentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploads.maxBytes, files: 1 },
  fileFilter(_req, file, callback) {
    if (!acceptedTypes.has(file.mimetype)) return callback(Object.assign(new Error('Upload a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file.'), { statusCode: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }));
    return callback(null, true);
  },
});

export const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(Object.assign(new Error('Choose a JPG, PNG, or WebP profile photo.'), { statusCode: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }));
    }
    return callback(null, true);
  },
});
