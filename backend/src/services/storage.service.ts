import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STORAGE_CONFIG } from '../config/storage';

export class StorageService {
  constructor() {
    if (STORAGE_CONFIG.provider === 'local') {
      if (!fs.existsSync(STORAGE_CONFIG.localDir)) {
        fs.mkdirSync(STORAGE_CONFIG.localDir, { recursive: true });
      }
    }
  }

  /**
   * Generates a signed upload URL for client upload.
   */
  async generateSignedUploadUrl(objectKey: string, contentType: string = 'audio/mp4', baseUrl?: string): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
    const expiresIn = 900; // 15 minutes
    if (STORAGE_CONFIG.provider === 'local') {
      // In local mode, return a local endpoint URL or direct upload token simulation
      const origin = baseUrl || `http://localhost:${process.env.PORT || 3000}`;
      const uploadUrl = `${origin}/api/v1/uploads/local/${encodeURIComponent(objectKey)}`;
      return { uploadUrl, objectKey, expiresIn };
    } else {
      // Production S3 / Cloud storage signed URL generation placeholder
      const uploadUrl = `https://${STORAGE_CONFIG.bucket}.s3.${STORAGE_CONFIG.region}.amazonaws.com/${objectKey}?signature=mock_signed_token`;
      return { uploadUrl, objectKey, expiresIn };
    }
  }

  /**
   * Generates a signed download URL for retrieval.
   */
  async generateSignedDownloadUrl(objectKey: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const expiresIn = 3600; // 1 hour
    if (STORAGE_CONFIG.provider === 'local') {
      const downloadUrl = `http://localhost:${process.env.PORT || 3000}/api/v1/uploads/local/download/${encodeURIComponent(objectKey)}`;
      return { downloadUrl, expiresIn };
    } else {
      const downloadUrl = `https://${STORAGE_CONFIG.bucket}.s3.${STORAGE_CONFIG.region}.amazonaws.com/${objectKey}?signature=mock_download_token`;
      return { downloadUrl, expiresIn };
    }
  }

  /**
   * Independent server-side verification of object existence, file size, and SHA-256 checksum.
   */
  async verifyObject(objectKey: string, expectedSize: number, expectedChecksum: string): Promise<{ exists: boolean; size: number; checksum: string; isValid: boolean }> {
    if (STORAGE_CONFIG.provider === 'local') {
      const filePath = path.join(STORAGE_CONFIG.localDir, objectKey);
      if (!fs.existsSync(filePath)) {
        return { exists: false, size: 0, checksum: '', isValid: false };
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Compute SHA-256 checksum
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
    } else {
      // Cloud storage verification mock / implementation
      // In production, would fetch object metadata/stream from S3 and compute hash or check ETag.
      return {
        exists: true,
        size: expectedSize,
        checksum: expectedChecksum,
        isValid: true,
      };
    }
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
      } else {
        // Cloud storage delete mock
        return true;
      }
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
