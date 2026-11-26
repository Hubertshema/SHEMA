import { query } from '../config/database';

export const logAudit = async (userId: string | null, deviceId: string | null, action: string, status: 'SUCCESS' | 'FAILURE') => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, device_id, action, status) VALUES ($1, $2, $3, $4)`,
      [userId, deviceId, action, status]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};
