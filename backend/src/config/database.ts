import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. Add it to backend/.env before starting the API or test suite.');
}

const url = new URL(databaseUrl);

// pg does not use libpq channel binding. Keep SSL verification explicit and remove
// the unsupported option before passing the URL to node-postgres.
url.searchParams.delete('channel_binding');
if (['prefer', 'require', 'verify-ca'].includes(url.searchParams.get('sslmode') || '')) {
  url.searchParams.set('sslmode', 'verify-full');
}

const poolConfig: PoolConfig = {
  connectionString: url.toString(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Tests explicitly close the pool. Unref an idle socket as an additional
  // safeguard so Jest does not report a PostgreSQL TCP handle during teardown.
  allowExitOnIdle: process.env.NODE_ENV === 'test',
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.trim().substring(0, 60), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
};

export const runMigrations = async () => {
  try {
    const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      console.log('Database migrations executed successfully.');
    } else {
      console.warn('Migration file not found at:', migrationPath);
    }
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    throw error;
  }
};
