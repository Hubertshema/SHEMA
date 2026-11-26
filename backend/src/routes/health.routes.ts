import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  const startTime = Date.now();

  try {
    await query('SELECT 1');
    dbLatencyMs = Date.now() - startTime;
  } catch (error) {
    dbStatus = 'unhealthy';
    dbLatencyMs = Date.now() - startTime;
  }

  let version = '1.0.0';
  try {
    const pkgPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) {
        version = pkg.version;
      }
    }
  } catch (e) {
    // Fallback default version
  }

  const statusCode = dbStatus === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: dbStatus === 'healthy',
    status: dbStatus === 'healthy' ? 'operational' : 'degraded',
    version,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      storage: {
        status: 'operational',
      },
    },
  });
});

export default router;
