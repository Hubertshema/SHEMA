import { query } from '../config/database';
import { storageService } from './storage.service';
import { STORAGE_CONFIG } from '../config/storage';
import { logAudit } from '../middleware/audit.middleware';
import { v2 as cloudinary } from 'cloudinary';

export class UploadService {
  async initiateUpload(userId: string, data: {
    recordingId?: string;
    deviceId: string;
    callType?: string;
    durationSeconds?: number;
    encryptedFileSize: number;
    expectedChecksum: string;
    fileFormat?: string;
    phoneNumber?: string;
    contactName?: string;
  }, baseUrl?: string) {
    let recordingId = data.recordingId;

    if (!recordingId) {
      // Create recording record automatically if recordingId not supplied
      const storageObjectKey = `recordings/${userId}/${data.deviceId}/${Date.now()}_${data.expectedChecksum.substring(0, 10)}.${data.fileFormat || 'm4a'}`;
      const recResult = await query(
        `INSERT INTO recordings (user_id, device_id, call_type, duration_seconds, file_format, encrypted_file_size, checksum_sha256, storage_object_key, phone_number, contact_name, upload_status, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 'UNVERIFIED') RETURNING id, storage_object_key`,
        [
          userId,
          data.deviceId,
          data.callType || 'INCOMING',
          data.durationSeconds || 0,
          data.fileFormat || 'm4a',
          data.encryptedFileSize,
          data.expectedChecksum,
          storageObjectKey,
          data.phoneNumber || null,
          data.contactName || null,
        ]
      );
      recordingId = recResult.rows[0].id;
    }

    // Get recording storage object key
    const recQuery = await query(`SELECT storage_object_key FROM recordings WHERE id = $1 AND user_id = $2`, [recordingId, userId]);
    if (recQuery.rows.length === 0) {
      const error: any = new Error('Recording not found');
      error.statusCode = 404;
      throw error;
    }
    const storageObjectKey = recQuery.rows[0].storage_object_key;

    // Create upload session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const sessionResult = await query(
      `INSERT INTO upload_sessions (recording_id, user_id, device_id, upload_status, expected_file_size, expected_checksum, expires_at)
       VALUES ($1, $2, $3, 'PENDING', $4, $5, $6) RETURNING *`,
      [recordingId, userId, data.deviceId, data.encryptedFileSize, data.expectedChecksum, expiresAt]
    );

    const session = sessionResult.rows[0];
    const signedUpload = await storageService.generateSignedUploadUrl(storageObjectKey, 'audio/mp4', baseUrl);

    await logAudit(userId, data.deviceId, 'INITIATE_UPLOAD', 'SUCCESS');

    return {
      sessionId: session.id,
      recordingId,
      uploadUrl: signedUpload.uploadUrl,
      objectKey: storageObjectKey,
      expiresAt: session.expires_at,
    };
  }

  async completeUpload(userId: string, sessionId: string) {
    const sessionResult = await query(
      `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      const error: any = new Error('Upload session not found');
      error.statusCode = 404;
      throw error;
    }

    const session = sessionResult.rows[0];
    if (session.upload_status === 'COMPLETED') {
      return { success: true, message: 'Upload session already completed', sessionId };
    }

    if (session.upload_status === 'CANCELLED' || new Date() > new Date(session.expires_at)) {
      const error: any = new Error('Upload session is expired or cancelled');
      error.statusCode = 400;
      throw error;
    }

    // Get recording storage object key
    const recResult = await query(`SELECT storage_object_key FROM recordings WHERE id = $1`, [session.recording_id]);
    if (recResult.rows.length === 0) {
      const error: any = new Error('Associated recording not found');
      error.statusCode = 404;
      throw error;
    }
    const storageObjectKey = recResult.rows[0].storage_object_key;

    // Independent server-side verification of object existence, file size, and SHA-256 checksum
    const verification = await storageService.verifyObject(storageObjectKey, session.expected_file_size, session.expected_checksum);

    if (!verification.exists) {
      const error: any = new Error('Uploaded file not found in storage object store');
      error.statusCode = 400;
      throw error;
    }

    const verificationStatus = verification.isValid ? 'VERIFIED' : 'FAILED';
    const uploadStatus = verification.isValid ? 'COMPLETED' : 'FAILED';

    // Get Cloudinary secure_url for storage_url
    let storageUrl: string | null = null;
    if (STORAGE_CONFIG.provider === 'cloudinary' && verification.isValid) {
      try {
        const resource = await cloudinary.api.resource(storageObjectKey, {
          resource_type: 'video',
          type: 'upload',
        });
        storageUrl = resource.secure_url || null;
      } catch {
        // storage_url optional
      }
    }

    // Update upload session
    await query(
      `UPDATE upload_sessions SET upload_status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [uploadStatus, sessionId]
    );

    // Update recording
    await query(
      `UPDATE recordings SET upload_status = $1, verification_status = $2, uploaded_at = CURRENT_TIMESTAMP, verified_at = CURRENT_TIMESTAMP, storage_url = COALESCE($3, storage_url) WHERE id = $4`,
      [uploadStatus, verificationStatus, storageUrl, session.recording_id]
    );

    await logAudit(userId, session.device_id, 'COMPLETE_UPLOAD', verification.isValid ? 'SUCCESS' : 'FAILURE');

    if (!verification.isValid) {
      const error: any = new Error(`File verification failed. Size match: ${verification.size === Number(session.expected_file_size)}, Checksum match: ${verification.checksum.toLowerCase() === session.expected_checksum.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    return {
      success: true,
      sessionId,
      recordingId: session.recording_id,
      verificationStatus,
      uploadStatus,
      fileSize: verification.size,
      checksum: verification.checksum,
    };
  }

  async getSessionStatus(userId: string, sessionId: string) {
    const result = await query(`SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
    if (result.rows.length === 0) {
      const error: any = new Error('Upload session not found');
      error.statusCode = 404;
      throw error;
    }
    return result.rows[0];
  }

  async cancelSession(userId: string, sessionId: string) {
    const result = await query(
      `UPDATE upload_sessions SET upload_status = 'CANCELLED' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [sessionId, userId]
    );
    if (result.rows.length === 0) {
      const error: any = new Error('Upload session not found');
      error.statusCode = 404;
      throw error;
    }
    await logAudit(userId, result.rows[0].device_id, 'CANCEL_UPLOAD', 'SUCCESS');
    return { success: true, sessionId };
  }
}

export const uploadService = new UploadService();
