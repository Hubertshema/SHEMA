# CallVault Backend Production Deployment Guide

## 1. Architecture & Prerequisites
The CallVault backend is built with **Node.js, Express, TypeScript, and PostgreSQL**. It is designed to run in containerized environments (Docker, AWS ECS, Google Cloud Run, or Render) connected to a **Neon PostgreSQL** serverless database and S3-compatible object storage.

### Prerequisites:
- Node.js >= 18.x / npm >= 9.x
- Neon PostgreSQL Database instance
- S3-compatible Object Storage Bucket (AWS S3, Cloudflare R2, MinIO, or Neon Object Storage)

---

## 2. Environment Configuration
Create a production `.env` file based on `backend/.env.production.example`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@ep-sample-123456.us-east-2.aws.neon.tech/callvault?sslmode=require
JWT_SECRET=your_ultra_secure_jwt_access_secret_64_chars_min
JWT_REFRESH_SECRET=your_ultra_secure_jwt_refresh_secret_64_chars_min
STORAGE_PROVIDER=s3
STORAGE_BUCKET=callvault-production-storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 3. Database Setup & Migrations
1. Connect to your Neon PostgreSQL console or client.
2. Run the initial schema migration script:
   ```bash
   psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
   ```
3. Verify tables (`users`, `devices`, `recordings`, `upload_sessions`, `refresh_tokens`, `audit_logs`) and indexes are created successfully.

---

## 4. Building & Running the Backend
1. Install dependencies:
   ```bash
   cd backend
   npm ci
   ```
2. Build TypeScript output:
   ```bash
   npm run build
   ```
3. Run database tests:
   ```bash
   npm test
   ```
4. Start production server:
   ```bash
   npm start
   ```

---

## 5. Security Hardening & Maintenance
- **SSL / TLS**: Ensure reverse proxy (Nginx, ALB) terminates TLS with modern cipher suites (TLS 1.3).
- **Database Backups**: Neon provides automated continuous branching and point-in-time recovery (PITR). Regularly verify branch backups.
- **Audit Logging**: Monitor `audit_logs` table for suspicious auth failures and device registrations.
- **Rate Limiting**: Configured globally and on sensitive auth routes (`/auth/login`, `/auth/register`) to prevent brute-force attacks.
