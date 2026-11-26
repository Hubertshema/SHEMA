import { pool, query } from '../src/config/database';

describe('Database Connection & Schema Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('should connect to Neon PostgreSQL and execute health query', async () => {
    const res = await query('SELECT NOW() as now');
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].now).toBeDefined();
  });

  test('should verify tables exist in database', async () => {
    const res = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tables = res.rows.map((r) => r.table_name);
    expect(tables).toContain('users');
    expect(tables).toContain('devices');
    expect(tables).toContain('recordings');
    expect(tables).toContain('upload_sessions');
    expect(tables).toContain('refresh_tokens');
    expect(tables).toContain('audit_logs');
  });

  test('should verify recordings table has required columns', async () => {
    const res = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recordings'
    `);
    const columns = res.rows.map((r) => r.column_name);
    expect(columns).toContain('phone_number');
    expect(columns).toContain('contact_name');
  });
});
