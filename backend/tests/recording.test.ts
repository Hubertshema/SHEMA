import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';
import crypto from 'crypto';

describe('Recording Metadata API Tests', () => {
  let accessToken: string;
  let deviceId: string;
  let recordingId: string;
  const testEmail = `rec_test_${Date.now()}@callvault.app`;
  const checksum = crypto.createHash('sha256').update('dummy audio content').digest('hex');

  beforeAll(async () => {
    // Register user & device
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'password123' });
    accessToken = regRes.body.data.accessToken;

    const devRes = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceIdentifier: `dev_${Date.now()}`, model: 'Galaxy S24' });
    deviceId = devRes.body.data.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  test('POST /api/v1/recordings should register recording metadata', async () => {
    const res = await request(app)
      .post('/api/v1/recordings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        callType: 'INCOMING',
        durationSeconds: 120,
        fileFormat: 'm4a',
        encryptedFileSize: 10240,
        checksumSha256: checksum,
        encryptionAlgorithm: 'AES-256-GCM',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    recordingId = res.body.data.id;
  });

  test('GET /api/v1/recordings should list user recordings', async () => {
    const res = await request(app)
      .get('/api/v1/recordings')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/recordings/:id should get recording details', async () => {
    const res = await request(app)
      .get(`/api/v1/recordings/${recordingId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(recordingId);
  });

  test('DELETE /api/v1/recordings/:id should delete recording and cloud data', async () => {
    const res = await request(app)
      .delete(`/api/v1/recordings/${recordingId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
