import multer from 'multer';

const allowed = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed', 'video/mp4', 'video/quicktime',
]);

export const taskUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 },
  fileFilter(_req, file, callback) {
    if (!allowed.has(file.mimetype)) return callback(Object.assign(new Error('This file type is not supported.'), { statusCode: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }));
    callback(null, true);
  },
});
