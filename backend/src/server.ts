import dotenv from 'dotenv';
import app from './app';
import { runMigrations } from './config/database';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

const startServer = async () => {
  try {
    // Run migrations on startup if connected to DB
    await runMigrations();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CallVault backend server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error('Failed to start CallVault backend server:', error);
    process.exit(1);
  }
};

startServer();
