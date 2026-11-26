# CallVault Privacy and Consent Policy

## 1. Introduction
CallVault is designed with a **privacy-first, zero-knowledge architecture**. We believe that your call logs and encrypted audio archives belong exclusively to you. This document details our data collection practices, local encryption standards, cloud synchronization security, data retention, and account deletion procedures.

---

## 2. Data Collection & Minimization
CallVault strictly adheres to data minimization principles. We only collect the data necessary to provide secure call detection and archival services:
- **Call Metadata**: Timestamp, call type (Incoming, Outgoing, Missed), duration, phone number, and contact name (if granted contact read permission).
- **Encrypted Audio Archives**: Audio recordings captured locally during active calls are encrypted immediately upon completion before any storage or upload.
- **Device Identifiers**: Unique hardware identifiers (`device_identifier`), manufacturer, model, OS version, and app version to manage multi-device synchronization and security revocation.
- **Account Credentials**: Securely hashed email and password (using bcrypt with 10 salt rounds) for authentication. Plaintext passwords are never stored or logged.

---

## 3. Local Storage & AES-256-GCM Encryption
- **Encryption at Rest**: All call recordings and sensitive metadata stored on the mobile device are encrypted using **AES-256-GCM** (Galois/Counter Mode) with hardware-backed keys managed securely via the **Android Keystore System**.
- **Key Derivation & Protection**: Cryptographic keys never leave the device's Trusted Execution Environment (TEE) / Hardware Security Module (HSM).
- **Biometric Protection**: Access to the vault within the app can be locked behind biometric authentication (Fingerprint / Face ID) and PIN protection.

---

## 4. Cloud Uploads & Transmission Security
- **Transport Security**: All communication between the mobile application and the CallVault backend occurs over strict **TLS 1.3 / TLS 1.2** with certificate pinning.
- **Presigned URLs**: Cloud uploads are mediated via time-limited (15-minute) presigned URLs. The backend never accepts raw multipart streams directly, preventing memory exhaustion and unauthorized write vectors.
- **Integrity Verification**: Every uploaded file is verified server-side against its expected **SHA-256 checksum** and file size before marking the upload status as `COMPLETED`.

---

## 5. Data Retention & Auto-Purge
- **User-Controlled Retention**: Users retain full control over their archives. Recordings can be deleted locally or from the cloud at any time.
- **Storage Lifecycle**: Cloud records tied to active accounts remain stored until explicitly deleted by the user or upon account termination.
- **Audit Logs**: Security audit logs record authentication and device operations for 90 days for security monitoring, after which they are automatically purged.

---

## 6. Device Limitations & Permissions
- **Android Foreground Service**: Call detection and recording rely on Android `READ_PHONE_STATE` and foreground service permissions with persistent user-facing notifications.
- **Manufacturer Restrictions**: Certain OEM battery-saving policies or aggressive task killers may restrict background listening. CallVault provides in-app guidance for whitelisting.

---

## 7. Account Deletion Workflow
Users have the absolute right to completely erase their data at any time via the app settings or API:
1. **Revocation of Sessions**: All active JWT access and refresh tokens are immediately revoked.
2. **Device Deactivation**: All registered devices associated with the account are marked as `REVOKED`.
3. **Cloud Storage Purge**: All encrypted audio files stored in S3/cloud object storage are permanently deleted using their stored storage object keys.
4. **Database Cascade Deletion**: The user record and all associated records (devices, recordings, upload sessions, audit logs) are permanently purged from the PostgreSQL database via cascading foreign keys.
5. **Local Cleanup**: Mobile client clears all secure tokens, encryption keys, and cached logs from device storage.
