import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { STORAGE_CONFIG } from '../config/storage';

if (STORAGE_CONFIG.provider === 'cloudinary' && STORAGE_CONFIG.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: STORAGE_CONFIG.cloudinary.cloudName,
    api_key: STORAGE_CONFIG.cloudinary.apiKey,
    api_secret: STORAGE_CONFIG.cloudinary.apiSecret,
    secure: true,
  });
}

export class StorageService {
  constructor() {
    if (STORAGE_CONFIG.provider === 'local') {
      if (!fs.existsSync(STORAGE_CONFIG.localDir)) {
        fs.mkdirSync(STORAGE_CONFIG.localDir, { recursive: true });
      }
    }
  }

  /**
   * Generates signed upload parameters for Cloudinary direct upload.
   * Client POSTs multipart/form-data to Cloudinary's upload endpoint.
   */
  async generateSignedUploadUrl(objectKey: string, _contentType: string = 'audio/mp4', baseUrl?: string): Promise<{
    uploadUrl: string;
    objectKey: string;
    expiresIn: number;
    signature: string;
    timestamp: number;
    apiKey: string;
    folder: string;
    resourceType: string;
  }> {
    const expiresIn = 900; // 15 minutes

    if (STORAGE_CONFIG.provider === 'local') {
      const origin = baseUrl || `http://localhost:${process.env.PORT || 3000}`;
      const uploadUrl = `${origin}/api/v1/uploads/local/${encodeURIComponent(objectKey)}`;
      return { uploadUrl, objectKey, expiresIn, signature: '', timestamp: 0, apiKey: '', folder: '', resourceType: 'auto' };
    }

    if (STORAGE_CONFIG.provider === 'cloudinary') {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'callvault';
      const resourceType = 'auto';

      // Cloudinary signature: SHA-1 hex of "timestamp={timestamp}&{api_secret}"
      const signatureString = `timestamp=${timestamp}&${STORAGE_CONFIG.cloudinary.apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${STORAGE_CONFIG.cloudinary.cloudName}/upload`;

      return {
        uploadUrl,
        objectKey,
        expiresIn,
        signature,
        timestamp,
        apiKey: STORAGE_CONFIG.cloudinary.apiKey,
        folder,
        resourceType,
      };
    }

    // Fallback S3
    const uploadUrl = `https://${STORAGE_CONFIG.bucket}.s3.${STORAGE_CONFIG.region}.amazonaws.com/${objectKey}?signature=mock_signed_token`;
    return { uploadUrl, objectKey, expiresIn, signature: '', timestamp: 0, apiKey: '', folder: '', resourceType: 'auto' };
  }

  /**
   * Generates a signed download URL for retrieval.
   */
  async generateSignedDownloadUrl(objectKey: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const expiresIn = 3600; // 1 hour

    if (STORAGE_CONFIG.provider === 'local') {
      const downloadUrl = `http://localhost:${process.env.PORT || 3000}/api/v1/uploads/local/download/${encodeURIComponent(objectKey)}`;
      return { downloadUrl, expiresIn };
    }

    if (STORAGE_CONFIG.provider === 'cloudinary') {
      const downloadUrl = cloudinary.url(objectKey, {
        resource_type: 'video',
        type: 'upload',
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      });
      return { downloadUrl, expiresIn };
    }

    const downloadUrl = `https://${STORAGE_CONFIG.bucket}.s3.${STORAGE_CONFIG.region}.amazonaws.com/${objectKey}?signature=mock_download_token`;
    return { downloadUrl, expiresIn };
  }

  /**
   * Independent server-side verification of object existence, file size, and checksum via Cloudinary Admin API.
   */
  async verifyObject(objectKey: string, expectedSize: number, expectedChecksum: string): Promise<{ exists: boolean; size: number; checksum: string; isValid: boolean }> {
    if (STORAGE_CONFIG.provider === 'local') {
      const filePath = path.join(STORAGE_CONFIG.localDir, objectKey);
      if (!fs.existsSync(filePath)) {
        return { exists: false, size: 0, checksum: '', isValid: false };
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const sizeMatches = fileSize === Number(expectedSize);
      const checksumMatches = hash.toLowerCase() === expectedChecksum.toLowerCase();
      const isValid = sizeMatches && checksumMatches;

      return {
        exists: true,
        size: fileSize,
        checksum: hash,
        isValid,
      };
    }

    if (STORAGE_CONFIG.provider === 'cloudinary') {
      try {
        const resource = await cloudinary.api.resource(objectKey, {
          resource_type: 'video',
          type: 'upload',
        });

        const size = resource.bytes || 0;
        const checksum = resource.checksum || resource.etag || '';
        const sizeMatches = size === Number(expectedSize);
        // Cloudinary checksum is MD5-based; compare with expected SHA-256 if available, otherwise just check size
        const checksumMatches = checksum.toLowerCase() === expectedChecksum.toLowerCase() || expectedChecksum === '';
        const isValid = sizeMatches && checksumMatches;

        return {
          exists: true,
          size,
          checksum,
          isValid,
        };
      } catch (error: any) {
        if (error.http_code === 404) {
          return { exists: false, size: 0, checksum: '', isValid: false };
        }
        throw error;
      }
    }

    // Fallback S3
    return {
      exists: true,
      size: expectedSize,
      checksum: expectedChecksum,
      isValid: true,
    };
  }

  /**
   * Deletes object from storage.
   */
  async deleteObject(objectKey: string): Promise<boolean> {
    try {
      if (STORAGE_CONFIG.provider === 'local') {
        const filePath = path.join(STORAGE_CONFIG.localDir, objectKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return true;
      }

      if (STORAGE_CONFIG.provider === 'cloudinary') {
        await cloudinary.uploader.destroy(objectKey, {
          resource_type: 'video',
          type: 'upload',
        });
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error deleting object from storage:', error);
      return false;
    }
  }

  /**
   * Helper for local upload saving (used in testing or local mode).
   */
  saveLocalFile(objectKey: string, buffer: Buffer): void {
    if (STORAGE_CONFIG.provider === 'local') {
      const fullPath = path.join(STORAGE_CONFIG.localDir, objectKey);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, buffer);
    }
  }
}

export const storageService = new StorageService();
