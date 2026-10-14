import { v2 as cloudinary } from 'cloudinary';
import { env, requireEnvironmentValues } from './env.js';

let configured = false;
export const getCloudinary = () => {
  requireEnvironmentValues([
    ['CLOUDINARY_CLOUD_NAME', env.cloudinary.cloudName],
    ['CLOUDINARY_API_KEY', env.cloudinary.apiKey],
    ['CLOUDINARY_API_SECRET', env.cloudinary.apiSecret],
  ], 'Cloudinary uploads');
  if (!configured) {
    cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret, secure: true });
    configured = true;
  }
  return cloudinary;
};

export const uploadBuffer = (buffer, options) => new Promise((resolve, reject) => {
  getCloudinary().uploader.upload_stream(options, (error, result) => error ? reject(error) : resolve(result)).end(buffer);
});

export const deleteCloudAsset = (publicId, resourceType = 'image') => getCloudinary().uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
