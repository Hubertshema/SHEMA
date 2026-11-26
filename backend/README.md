# CallVault Backend API, Neon PostgreSQL & Cloud Storage

CallVault backend is a secure, production-grade Node.js, Express.js, and TypeScript application providing robust backend services, Neon PostgreSQL persistence, private object storage integration, JWT authentication with token rotation, device management, encrypted recording metadata registration, and independent server-side file verification.

## Architecture & Tech Stack

- **Language / Runtime**: TypeScript, Node.js, Express.js
- **Database**: Neon PostgreSQL (configured with connection pooling and SSL)
- **Authentication**: JWT Access Tokens (15m) & Refresh Tokens (7d) with bcrypt password hashing and token rotation
- **Cloud Storage**: Modular storage abstraction supporting S3-compatible cloud object storage or local filesystem storage for testing/development
- **Security**: Helmet security headers, CORS, express-rate-limit, Zod request validation, centralized error handling, and audit logging
- **Testing**: Jest & Supertest automated test suite

---

## Getting Started

### 1. Environment Configuration

Create a `.env` file in `backend/` based on `.env.example`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://<user>:<password>@<endpoint>-pooler.<region>.aws.neon.tech/<database>?sslmode=verify-full
JWT_SECRET=super_secret_jwt_access_key_callvault_2025
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_callvault_2025
JWT_EXPIRES_IN=15m
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./storage_uploads
STORAGE_BUCKET=callvault-recordings
STORAGE_REGION=us-east-2
```

### 2. Installation & Running

```bash
cd backend
npm install

# Run in development mode with live reload
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Run automated tests
npm test
```

---

## Database Schema

Managed via migrations in `backend/migrations/001_initial_schema.sql`:
- `users`: User profiles and password hashes
- `devices`: Registered mobile devices per user
- `recordings`: Call recording metadata, encryption details, and verification status
- `upload_sessions`: Multipart/signed upload sessions with expected file size and SHA-256 checksum
- `refresh_tokens`: Revocable refresh token hashes
- `audit_logs`: Security and access audit trail

---

## API Endpoints Summary

- **Auth**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- **Devices**: `POST /api/v1/devices`, `GET /api/v1/devices`, `DELETE /api/v1/devices/:id`
- **Recordings**: `POST /api/v1/recordings`, `GET /api/v1/recordings`, `GET /api/v1/recordings/:id`, `DELETE /api/v1/recordings/:id`
- **Uploads**: `POST /api/v1/uploads/initiate`, `POST /api/v1/uploads/:sessionId/complete`, `GET /api/v1/uploads/:sessionId`, `POST /api/v1/uploads/:sessionId/cancel`
