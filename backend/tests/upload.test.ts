import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';
import crypto from 'crypto';

describe('Upload Session & Verification API Tests', () => {
  let accessToken: string;
  let deviceId: string;
  const testEmail = `upload_test_${Date.now()}@callvault.app`;
  const fileContent = Buffer.from('encrypted audio test content for callvault');
  const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');
  const fileSize = fileContent.length;

  beforeAll(async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'password123' });
    accessToken = regRes.body.data.accessToken;

    const devRes = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceIdentifier: `dev_up_${Date.now()}`, model: 'Pixel 7' });
    deviceId = devRes.body.data.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  test('POST /api/v1/uploads/initiate should create upload session and return signed URL', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/initiate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId,
        callType: 'OUTGOING',
        durationSeconds: 45,
        encryptedFileSize: fileSize,
        expectedChecksum: checksum,
        fileFormat: 'm4a',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.uploadUrl).toBeDefined();

    const { sessionId, objectKey } = res.body.data;

    // Simulate client uploading file to local storage endpoint
    await request(app)
      .put(`/api/v1/uploads/local/${encodeURIComponent(objectKey)}`)
      .send(fileContent)
      .expect(200);

    // Complete upload session with server-side independent verification
    const completeRes = await request(app)
      .post(`/api/v1/uploads/${sessionId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.verificationStatus).toBe('VERIFIED');
    expect(completeRes.body.data.uploadStatus).toBe('COMPLETED');
  });
});
