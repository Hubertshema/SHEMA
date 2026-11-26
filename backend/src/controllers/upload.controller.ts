import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { storageService } from '../services/storage.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class UploadController {
  async initiate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const host = req.get('host');
      const baseUrl = host ? `${req.protocol}://${host}` : undefined;
      const result = await uploadService.initiateUpload(userId, req.body, baseUrl);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const sessionId = req.params.sessionId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const result = await uploadService.completeUpload(userId, sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const sessionId = req.params.sessionId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const result = await uploadService.getSessionStatus(userId, sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const sessionId = req.params.sessionId;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 401, message: 'Unauthorized' } });
      }
      const result = await uploadService.cancelSession(userId, sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // Local storage upload endpoint (for local provider testing)
  async handleLocalUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const objectKey = decodeURIComponent(req.params.objectKey);
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        storageService.saveLocalFile(objectKey, buffer);
        res.status(200).json({ success: true, message: 'File uploaded successfully', objectKey, size: buffer.length });
      });
    } catch (error) {
      next(error);
    }
  }

  async handleLocalDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const objectKey = decodeURIComponent(req.params.objectKey);
      res.status(200).json({ success: true, message: 'Local download placeholder', objectKey });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
