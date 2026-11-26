import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const initiateSchema = z.object({
  body: z.object({
    recordingId: z.string().uuid().optional(),
    deviceId: z.string().uuid(),
    callType: z.string().optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
    encryptedFileSize: z.number().positive(),
    expectedChecksum: z.string().length(64),
    fileFormat: z.string().optional(),
    phoneNumber: z.string().optional(),
    contactName: z.string().optional(),
  }),
});

router.post('/initiate', authenticateToken, validate(initiateSchema), (req, res, next) => uploadController.initiate(req, res, next));
router.post('/:sessionId/complete', authenticateToken, (req, res, next) => uploadController.complete(req, res, next));
router.get('/:sessionId', authenticateToken, (req, res, next) => uploadController.getStatus(req, res, next));
router.post('/:sessionId/cancel', authenticateToken, (req, res, next) => uploadController.cancel(req, res, next));

// Local storage handlers
router.put('/local/:objectKey', (req, res, next) => uploadController.handleLocalUpload(req, res, next));
router.get('/local/download/:objectKey', (req, res, next) => uploadController.handleLocalDownload(req, res, next));

export default router;
