# CallVault Operations & Maintenance Guide

## 1. Operational Monitoring
- **Health Monitoring**: Configure uptime monitors (e.g., UptimeRobot, Datadog, Pingdom) to poll `GET https://api.callvault.com/api/v1/health` every 60 seconds. Alert on non-200 responses or database status `degraded`.
- **Log Management**: Stream stdout/stderr container logs to centralized logging systems (Datadog, AWS CloudWatch, or Logtail). Monitor for unhandled exceptions and database query errors.

---

## 2. Database Backup & Disaster Recovery
- **Neon PostgreSQL Backups**: Neon provides automated continuous backups and Point-in-Time Recovery (PITR).
- **Branching**: For schema updates or emergency testing, create an instant database branch:
  ```bash
  neon branches create --name staging-recovery --parent main
  ```
- **Migration Execution**: Run migrations via version-controlled SQL scripts (`backend/migrations/001_initial_schema.sql`).

---

## 3. Storage Maintenance
- **Lifecycle Policies**: Configure S3 bucket lifecycle rules to transition completed audio uploads to Glacier/Infrequent Access after 90 days if long-term archival is required.
- **Orphaned Uploads**: Run periodic backend cleanup cron jobs to remove expired incomplete upload sessions.

---

## 4. Backend Update & Deployment Guide
1. Pull latest release tag from repository.
2. Build TypeScript output:
   ```bash
   cd backend && npm ci && npm run build
   ```
3. Run database migrations if schema changes are included.
4. Perform rolling zero-downtime deployment on the container hosting platform.
5. Verify health via `GET /api/v1/health`.
