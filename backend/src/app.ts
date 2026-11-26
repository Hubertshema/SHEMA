import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import recordingRoutes from './routes/recording.routes';
import uploadRoutes from './routes/upload.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// Trust reverse proxy headers (e.g. X-Forwarded-Proto) when deployed to cloud hosts
app.set('trust proxy', 1);

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/v1', (req: Request, res: Response) => {
  res.status(200).json({ success: true, service: 'CallVault API v1', status: 'healthy' });
});

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/recordings', recordingRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 404, message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;
