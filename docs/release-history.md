# CallVault Release History & Version 1.0.0 Release Notes

## Version 1.0.0 (Production Release)
**Release Date**: March 30, 2025
**Status**: General Availability (GA)

### Core Features & Highlights
1. **Automated Call Detection & Recording**:
   - Native Android telephony integration (`CallDetectionModule`) capturing high-fidelity call audio securely.
2. **Neon Serverless PostgreSQL Backend**:
   - Robust REST API built on Express, TypeScript, and Neon PostgreSQL with connection pooling and SSL encryption.
3. **Secure Cloud Storage**:
   - S3-compatible private object storage with time-limited pre-signed URLs and hash verification.
4. **Reliable Background Sync**:
   - Jetpack WorkManager integration (`CallVaultSyncWorker`) ensuring recordings sync reliably across Wi-Fi and mobile data with offline queuing.
5. **Production Health & Monitoring**:
   - Added comprehensive health check endpoint (`GET /api/v1/health`) with live database connectivity and latency reporting.

---

## Fixed Issues & Improvements
- Resolved connection pool timeout issues under high concurrency by tuning pool configurations (`max: 20`, `idleTimeoutMillis: 30000`).
- Hardened JWT authentication middleware against token spoofing and replay attacks.
- Optimized R8 / ProGuard rules to ensure seamless shrinking without stripping required React Native native modules.

---

## Known Limitations
- Call recording availability depends on device manufacturer audio routing policies (VoIP calls or specific Android OEM restrictions may require accessibility/microphone permissions configuration).
- Large audio file uploads (>50MB) require stable broadband connections.
