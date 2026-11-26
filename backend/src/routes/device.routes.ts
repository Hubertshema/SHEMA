import { Router } from 'express';
import { deviceController } from '../controllers/device.controller';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const deviceSchema = z.object({
  body: z.object({
    deviceIdentifier: z.string().min(1),
    deviceName: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    androidVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }),
});

router.post('/', authenticateToken, validate(deviceSchema), (req, res, next) => deviceController.registerOrUpdate(req, res, next));
router.get('/', authenticateToken, (req, res, next) => deviceController.getDevices(req, res, next));
router.delete('/:id', authenticateToken, (req, res, next) => deviceController.revokeDevice(req, res, next));

export default router;
