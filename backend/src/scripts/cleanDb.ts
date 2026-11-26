import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { STORAGE_CONFIG } from '../config/storage';

const cleanDb = async () => {
  try {
    console.log('Truncating all database tables...');
    await pool.query(
      'TRUNCATE TABLE audit_logs, refresh_tokens, upload_sessions, recordings, devices, users RESTART IDENTITY CASCADE;'
    );
    console.log('All database tables cleared.');

    if (STORAGE_CONFIG.provider === 'local' && fs.existsSync(STORAGE_CONFIG.localDir)) {
      const entries = fs.readdirSync(STORAGE_CONFIG.localDir);
      for (const entry of entries) {
        if (entry === '.gitkeep') continue;
        fs.rmSync(path.join(STORAGE_CONFIG.localDir, entry), { recursive: true, force: true });
      }
      console.log('Local storage_uploads cleared.');
    }
  } catch (error) {
    console.error('Failed to clean database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

cleanDb();
