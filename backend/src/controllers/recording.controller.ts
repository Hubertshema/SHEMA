import { Response, NextFunction } from 'express';
import { recordingService } from '../services/recording.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class RecordingController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const recording = await recordingService.registerRecording(userId, req.body);
      res.status(201).json({ success: true, data: recording });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const deviceId = req.query.deviceId as string | undefined;

      const recordings = await recordingService.getRecordingsForUser(userId, { limit, offset, deviceId });
      res.status(200).json({ success: true, data: recordings });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const recordingId = req.params.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const recording = await recordingService.getRecordingById(userId, recordingId);
      res.status(200).json({ success: true, data: recording });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const recordingId = req.params.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const result = await recordingService.deleteRecording(userId, recordingId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const recordingController = new RecordingController();
