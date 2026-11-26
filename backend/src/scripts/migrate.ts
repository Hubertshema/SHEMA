import { runMigrations, pool } from '../config/database';

const run = async () => {
  try {
    console.log('Running database migrations...');
    await runMigrations();
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
