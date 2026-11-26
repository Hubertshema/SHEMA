import { query } from '../config/database';
import { logAudit } from '../middleware/audit.middleware';

export class DeviceService {
  async registerOrUpdateDevice(userId: string, data: {
    deviceIdentifier: string;
    deviceName?: string;
    manufacturer?: string;
    model?: string;
    androidVersion?: string;
    appVersion?: string;
  }) {
    const { deviceIdentifier, deviceName, manufacturer, model, androidVersion, appVersion } = data;

    // Check if device exists for user
    const existing = await query(
      `SELECT id, device_status FROM devices WHERE user_id = $1 AND device_identifier = $2`,
      [userId, deviceIdentifier]
    );

    let device;
    if (existing.rows.length > 0) {
      device = existing.rows[0];
      if (device.device_status !== 'ACTIVE') {
        const error: any = new Error('Device is revoked or inactive');
        error.statusCode = 403;
        throw error;
      }
      const updateResult = await query(
        `UPDATE devices SET device_name = COALESCE($1, device_name), manufacturer = COALESCE($2, manufacturer), model = COALESCE($3, model), android_version = COALESCE($4, android_version), app_version = COALESCE($5, app_version), last_seen_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
        [deviceName, manufacturer, model, androidVersion, appVersion, device.id]
      );
      device = updateResult.rows[0];
    } else {
      const insertResult = await query(
        `INSERT INTO devices (user_id, device_identifier, device_name, manufacturer, model, android_version, app_version, device_status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE') RETURNING *`,
        [userId, deviceIdentifier, deviceName, manufacturer, model, androidVersion, appVersion]
      );
      device = insertResult.rows[0];
    }

    await logAudit(userId, device.id, 'DEVICE_REGISTER', 'SUCCESS');
    return device;
  }

  async getDevicesForUser(userId: string) {
    const result = await query(`SELECT * FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC`, [userId]);
    return result.rows;
  }

  async revokeDevice(userId: string, deviceId: string) {
    const result = await query(
      `UPDATE devices SET device_status = 'REVOKED' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [deviceId, userId]
    );
    if (result.rows.length === 0) {
      const error: any = new Error('Device not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    await logAudit(userId, deviceId, 'DEVICE_REVOKE', 'SUCCESS');
    return result.rows[0];
  }
}

export const deviceService = new DeviceService();
