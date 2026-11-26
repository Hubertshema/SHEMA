import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const STORAGE_CONFIG = {
  provider: process.env.STORAGE_PROVIDER || 'local',
  localDir: process.env.STORAGE_LOCAL_DIR || path.join(__dirname, '../../storage_uploads'),
  bucket: process.env.STORAGE_BUCKET || 'callvault-recordings',
  region: process.env.STORAGE_REGION || 'us-east-2',
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};
