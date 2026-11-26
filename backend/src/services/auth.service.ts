import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database';
import { logAudit } from '../middleware/audit.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_callvault_2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_callvault_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

export class AuthService {
  async register(email: string, passwordPlain: string) {
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      const error: any = new Error('User with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

    const result = await query(
      `INSERT INTO users (email, password_hash, account_status) VALUES ($1, $2, 'ACTIVE') RETURNING id, email, phone_number, account_status, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    const tokens = await this.generateTokens(user.id, user.email, user.phone_number);

    await logAudit(user.id, null, 'USER_REGISTER', 'SUCCESS');

    return { user, ...tokens };
  }

  async login(email: string, passwordPlain: string) {
    const result = await query(`SELECT id, email, phone_number, password_hash, account_status FROM users WHERE email = $1`, [email]);
    if (result.rows.length === 0) {
      await logAudit(null, null, 'USER_LOGIN', 'FAILURE');
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const user = result.rows[0];
    if (user.account_status !== 'ACTIVE') {
      const error: any = new Error('Account is suspended or deleted');
      error.statusCode = 403;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!passwordMatch) {
      await logAudit(user.id, null, 'USER_LOGIN', 'FAILURE');
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
    const tokens = await this.generateTokens(user.id, user.email, user.phone_number);

    await logAudit(user.id, null, 'USER_LOGIN', 'SUCCESS');

    return {
      user: { id: user.id, email: user.email, phone_number: user.phone_number, account_status: user.account_status },
      ...tokens,
    };
  }

  async registerOrLoginByPhone(phoneNumber: string) {
    const existing = await query(`SELECT id, email, phone_number, account_status FROM users WHERE phone_number = $1`, [phoneNumber]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.account_status !== 'ACTIVE') {
        const error: any = new Error('Account is suspended or deleted');
        error.statusCode = 403;
        throw error;
      }

      await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
      const tokens = await this.generateTokens(user.id, user.email, user.phone_number);

      await logAudit(user.id, null, 'USER_LOGIN_BY_PHONE', 'SUCCESS');

      return {
        user: { id: user.id, email: user.email, phone_number: user.phone_number, account_status: user.account_status },
        ...tokens,
        isNewUser: false,
      };
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(`callvault_${phoneNumber}_${Date.now()}`, saltRounds);

    const result = await query(
      `INSERT INTO users (phone_number, password_hash, account_status) VALUES ($1, $2, 'ACTIVE') RETURNING id, email, phone_number, account_status, created_at`,
      [phoneNumber, passwordHash]
    );

    const user = result.rows[0];
    const tokens = await this.generateTokens(user.id, user.email, user.phone_number);

    await logAudit(user.id, null, 'USER_REGISTER_BY_PHONE', 'SUCCESS');

    return {
      user: { id: user.id, email: user.email, phone_number: user.phone_number, account_status: user.account_status },
      ...tokens,
      isNewUser: true,
    };
  }

  async refreshToken(refreshTokenString: string) {
    try {
      const payload = jwt.verify(refreshTokenString, JWT_REFRESH_SECRET) as { userId: string; email: string | null; phoneNumber: string | null };
      const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');

      const tokenResult = await query(
        `SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2`,
        [payload.userId, tokenHash]
      );

      if (tokenResult.rows.length === 0 || tokenResult.rows[0].revoked_at || new Date() > new Date(tokenResult.rows[0].expires_at)) {
        const error: any = new Error('Invalid or expired refresh token');
        error.statusCode = 403;
        throw error;
      }

      // Revoke old refresh token (rotation)
      await query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1`, [tokenResult.rows[0].id]);

      const tokens = await this.generateTokens(payload.userId, payload.email, payload.phoneNumber);
      return tokens;
    } catch (err) {
      const error: any = new Error('Invalid or expired refresh token');
      error.statusCode = 403;
      throw error;
    }
  }

  async logout(userId: string, refreshTokenString?: string) {
    if (refreshTokenString) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
      await query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND token_hash = $2`, [userId, tokenHash]);
    } else {
      await query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
    }
    await logAudit(userId, null, 'USER_LOGOUT', 'SUCCESS');
    return { success: true };
  }

  private async generateTokens(userId: string, email: string | null, phoneNumber: string | null) {
    const accessToken = jwt.sign({ userId, email, phoneNumber }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const refreshTokenPlain = jwt.sign({ userId, email, phoneNumber }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    const tokenHash = crypto.createHash('sha256').update(refreshTokenPlain).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      expiresIn: 900, // 15 mins in seconds
    };
  }
}

export const authService = new AuthService();
