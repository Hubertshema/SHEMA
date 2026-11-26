# CallVault Recovery and Failure Handling Guide

## 1. Overview
CallVault implements robust fault tolerance and recovery mechanisms across mobile recording, local encryption, cloud upload, and synchronization layers to ensure zero data loss and graceful degradation under adverse network or hardware conditions.

---

## 2. Recording & Audio Capture Failure Recovery
- **Interruption Handling**: If an incoming call interrupts an ongoing recording or if the audio session is abruptly terminated, the audio recorder flushes existing buffers, finalizes headers, and saves the partial recording with a `CORRUPTED` or `PARTIAL` flag in the local database.
- **Low Disk Space Protection**: Prior to initiating a recording session, the app verifies available device storage (minimum 50MB required). If storage is insufficient, recording is safely aborted, and a persistent notification alerts the user.
- **Foreground Service Resilience**: Call monitoring runs inside an Android Foreground Service with a persistent notification to prevent aggressive OS battery optimization from killing the listener.

---

## 3. Storage & Upload Failure Handling
- **WorkManager Background Sync**: Uploads and synchronization tasks are delegated to Android WorkManager with strict constraints (`NetworkType.CONNECTED`, battery not low).
- **Exponential Backoff Retry**: Failed uploads due to transient network drops or server errors automatically trigger exponential backoff retries (e.g., 30s, 2m, 10m).
- **Idempotent Registrations**: Recording registration and upload sessions are fully idempotent. Re-submitting an existing `checksum_sha256` returns the existing record state without creating duplicates.
- **Checksum & Size Verification**: If a cloud upload fails mid-stream or verification fails (`verifyObject` checksum mismatch), the upload session is marked as `FAILED`, and the client re-initiates the upload session.

---

## 4. Synchronization & Conflict Resolution
- **Offline-First Architecture**: Recordings captured while offline are stored securely in local SQLite with encryption. When connectivity is restored, `SyncService` processes pending queues sequentially.
- **Database Consistency**: Neon PostgreSQL transactions ensure atomic operations across recordings, upload sessions, and audit logs.
- **Token Refresh Recovery**: When an access token expires (15-minute lifespan), the API client automatically uses the secure refresh token (7-day lifespan) to request a new access token without interrupting user workflows. If the refresh token is expired or revoked, the user is safely redirected to the login screen.
