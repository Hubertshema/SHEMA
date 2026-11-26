import { runMigrations } from '../src/config/database';

let migrationPromise: Promise<void> | null = null;

beforeAll(async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations();
  }
  await migrationPromise;
});
