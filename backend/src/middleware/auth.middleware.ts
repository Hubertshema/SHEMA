import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string | null;
    phoneNumber: string | null;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 401, message: 'Access token missing or malformed' },
    });
  }

  const secret = process.env.JWT_SECRET || 'super_secret_jwt_access_key_callvault_2025';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: 'Invalid or expired access token' },
      });
    }
    req.user = user as { userId: string; email: string | null; phoneNumber: string | null };
    next();
  });
};
