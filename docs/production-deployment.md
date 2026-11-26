# CallVault Production Deployment Architecture & Guide

## 1. Executive Summary
This document defines the production deployment architecture, infrastructure topology, hosting strategies, and configuration workflows for the CallVault platform (v1.0.0). CallVault consists of a high-performance Node.js/Express backend API, a serverless Neon PostgreSQL database, S3-compatible private object storage, and a React Native Android application.

---

## 2. Deployment Architecture & Hosting Strategy

### Backend API (`callvault-backend`)
- **Hosting Provider**: Render / AWS ECS / Fly.io / Railway (Containerized Node.js runtime).
- **Runtime**: Node.js 18.x LTS / Express with TypeScript.
- **Scaling**: Horizontal auto-scaling behind an HTTPS load balancer with TLS 1.3 termination.
- **Process Management**: Managed via PM2 or container orchestration (`npm start` -> `node dist/server.js`).

### Database (`Neon PostgreSQL`)
- **Provider**: Neon Serverless Postgres (`ep-odd-sun-bec9trop-pooler.c-9.us-east-2.aws.neon.tech`).
- **Configuration**: Connection pooling enabled (`max: 20`), SSL enforced (`sslmode=require`), channel binding required.
- **Backups & Branching**: Automated point-in-time recovery (PITR) and instant database branching for safe staging and migration testing.

### Object Storage (`AWS S3 / R2 / Neon Object Storage`)
- **Provider**: AWS S3 (or S3-compatible private bucket).
- **Security**: Private bucket access with server-side encryption (SSE-S3), pre-signed upload/download URLs (TTL: 15 minutes), and strict CORS policies.

---

## 3. Environment Variables & Configuration
Production environment variables must be securely injected via the hosting provider's secrets manager (never checked into version control).

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://neondb_owner:***@ep-odd-sun-bec9trop-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=production_access_jwt_secret_min_64_random_characters_xyz123
JWT_REFRESH_SECRET=production_refresh_jwt_secret_min_64_random_characters_abc789
STORAGE_PROVIDER=s3
STORAGE_BUCKET=callvault-production-storage-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 4. HTTPS, TLS & Network Security
- **Transport Security**: All inbound and outbound traffic must use TLS 1.3 / TLS 1.2 with strong cipher suites. HTTP requests are automatically redirected to HTTPS.
- **CORS Policy**: Configured explicitly to accept requests from authorized client origins and mobile user agents.
- **Rate Limiting**: Global API rate limiter (`apiLimiter`: 100 requests per 15 minutes per IP) combined with strict authentication endpoint throttling.

---

## 5. Health Checks & Monitoring
- **Endpoint**: `GET /api/v1/health`
- **Response**: Returns operational status, database query latency, storage status, version, and UTC timestamp.
- **Liveness Probe**: Monitored by the hosting load balancer every 30 seconds.
