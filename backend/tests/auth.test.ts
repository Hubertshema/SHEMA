import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

describe('Authentication & Device API Tests', () => {
  let accessToken: string;
  let refreshToken: string;
  let testEmail = `test_${Date.now()}@callvault.app`;
  let deviceId: string;

  afterAll(async () => {
    await pool.end();
  });

  test('POST /api/v1/auth/register should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'securePassword123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.accessToken).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  test('POST /api/v1/auth/login should authenticate user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'securePassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('POST /api/v1/devices should register a device', async () => {
    const res = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceIdentifier: `android_device_${Date.now()}`,
        deviceName: 'Pixel 8 Pro',
        manufacturer: 'Google',
        model: 'Pixel 8 Pro',
        androidVersion: '14',
        appVersion: '1.0.0',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    deviceId = res.body.data.id;
  });

  test('GET /api/v1/devices should list registered devices', async () => {
    const res = await request(app)
      .get('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
