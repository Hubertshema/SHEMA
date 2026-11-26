import { query } from '../config/database';
import { storageService } from './storage.service';
import { logAudit } from '../middleware/audit.middleware';

export class RecordingService {
  async registerRecording(userId: string, data: {
    deviceId: string;
    callType: string;
    durationSeconds: number;
    fileFormat?: string;
    encryptedFileSize: number;
    checksumSha256: string;
    encryptionAlgorithm?: string;
    storageObjectKey?: string;
    phoneNumber?: string;
    contactName?: string;
  }) {
    // Verify device belongs to user
    const deviceCheck = await query(`SELECT id FROM devices WHERE id = $1 AND user_id = $2`, [data.deviceId, userId]);
    if (deviceCheck.rows.length === 0) {
      const error: any = new Error('Device not found or does not belong to user');
      error.statusCode = 403;
      throw error;
    }

    const storageObjectKey = data.storageObjectKey || `recordings/${userId}/${data.deviceId}/${Date.now()}_${data.checksumSha256.substring(0, 10)}.${data.fileFormat || 'm4a'}`;

    const result = await query(
      `INSERT INTO recordings (user_id, device_id, call_type, duration_seconds, file_format, encrypted_file_size, checksum_sha256, encryption_algorithm, storage_object_key, phone_number, contact_name, upload_status, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 'UNVERIFIED') RETURNING *`,
      [
        userId,
        data.deviceId,
        data.callType,
        data.durationSeconds,
        data.fileFormat || 'm4a',
        data.encryptedFileSize,
        data.checksumSha256,
        data.encryptionAlgorithm || 'AES-256-GCM',
        storageObjectKey,
        data.phoneNumber || null,
        data.contactName || null,
      ]
    );

    const recording = result.rows[0];
    await logAudit(userId, data.deviceId, 'REGISTER_RECORDING', 'SUCCESS');
    return recording;
  }

  async getRecordingsForUser(userId: string, queryParams: { limit?: number; offset?: number; deviceId?: string }) {
    let sql = `SELECT * FROM recordings WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (queryParams.deviceId) {
      sql += ` AND device_id = $${paramIndex++}`;
      params.push(queryParams.deviceId);
    }

    sql += ` ORDER BY created_at DESC`;

    if (queryParams.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(queryParams.limit);
    }
    if (queryParams.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(queryParams.offset);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  async getRecordingById(userId: string, recordingId: string) {
    const result = await query(`SELECT * FROM recordings WHERE id = $1 AND user_id = $2`, [recordingId, userId]);
    if (result.rows.length === 0) {
      const error: any = new Error('Recording not found');
      error.statusCode = 404;
      throw error;
    }

    const recording = result.rows[0];
    let downloadUrl = null;
    if (recording.upload_status === 'COMPLETED' && recording.storage_object_key) {
      const signed = await storageService.generateSignedDownloadUrl(recording.storage_object_key);
      downloadUrl = signed.downloadUrl;
    }

    return { ...recording, downloadUrl };
  }

  async deleteRecording(userId: string, recordingId: string) {
    const result = await query(`SELECT * FROM recordings WHERE id = $1 AND user_id = $2`, [recordingId, userId]);
    if (result.rows.length === 0) {
      const error: any = new Error('Recording not found');
      error.statusCode = 404;
      throw error;
    }

    const recording = result.rows[0];
    if (recording.storage_object_key) {
      await storageService.deleteObject(recording.storage_object_key);
    }

    await query(`DELETE FROM recordings WHERE id = $1`, [recordingId]);
    await logAudit(userId, recording.device_id, 'DELETE_RECORDING', 'SUCCESS');
    return { success: true, id: recordingId };
  }
}

export const recordingService = new RecordingService();
