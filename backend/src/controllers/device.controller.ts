import { Response, NextFunction } from 'express';
import { deviceService } from '../services/device.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DeviceController {
  async registerOrUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const device = await deviceService.registerOrUpdateDevice(userId, req.body);
      res.status(200).json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }

  async getDevices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const devices = await deviceService.getDevicesForUser(userId);
      res.status(200).json({ success: true, data: devices });
    } catch (error) {
      next(error);
    }
  }

  async revokeDevice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const deviceId = req.params.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const device = await deviceService.revokeDevice(userId, deviceId);
      res.status(200).json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }
}

export const deviceController = new DeviceController();
