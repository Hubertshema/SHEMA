import { Router } from 'express';
import { recordingController } from '../controllers/recording.controller';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const recordingSchema = z.object({
  body: z.object({
    deviceId: z.string().uuid(),
    callType: z.string(),
    durationSeconds: z.number().int().nonnegative(),
    fileFormat: z.string().optional(),
    encryptedFileSize: z.number().positive(),
    checksumSha256: z.string().length(64),
    encryptionAlgorithm: z.string().optional(),
    storageObjectKey: z.string().optional(),
    phoneNumber: z.string().optional(),
    contactName: z.string().optional(),
  }),
});

router.post('/', authenticateToken, validate(recordingSchema), (req, res, next) => recordingController.register(req, res, next));
router.get('/', authenticateToken, (req, res, next) => recordingController.getAll(req, res, next));
router.get('/:id', authenticateToken, (req, res, next) => recordingController.getById(req, res, next));
router.delete('/:id', authenticateToken, (req, res, next) => recordingController.delete(req, res, next));

export default router;
