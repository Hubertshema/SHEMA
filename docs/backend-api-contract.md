# CallVault Mobile API Contract & Integration Guide

This document defines the REST API contract between the CallVault React Native mobile application and the CallVault Backend API.

## Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.callvault.app/api/v1`

---

## Authentication & Headers

All protected endpoints require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Response format across all endpoints:
- Success: `2xx` status with `{ success: true, data: { ... } }`
- Error: `4xx / 5xx` status with `{ success: false, error: { code: number, message: string, details?: any } }`

---

## 1. Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "user@example.com", "account_status": "ACTIVE" },
      "accessToken": "jwt_token...",
      "refreshToken": "refresh_token...",
      "expiresIn": 900
    }
  }
  ```

### Login User
- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (`200 OK`)**: Same as registration.

### Refresh Token
- **POST** `/auth/refresh`
- **Body**: `{ "refreshToken": "refresh_token..." }`
- **Response (`200 OK`)**: New access token and refresh token.

### Logout
- **POST** `/auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**: `{ "refreshToken": "refresh_token..." }`

---

## 2. Device Management Endpoints

### Register / Update Device
- **POST** `/devices`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "deviceIdentifier": "unique_android_hardware_id",
    "deviceName": "Pixel 8 Pro",
    "manufacturer": "Google",
    "model": "Pixel 8 Pro",
    "androidVersion": "14",
    "appVersion": "1.0.0"
  }
  ```
- **Response (`200 OK`)**: Device object with UUID.

### List User Devices
- **GET** `/devices`
- **Headers**: `Authorization: Bearer <accessToken>`

### Revoke Device
- **DELETE** `/devices/:id`
- **Headers**: `Authorization: Bearer <accessToken>`

---

## 3. Recording Metadata Endpoints

### Register Recording Metadata
- **POST** `/recordings`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "deviceId": "device_uuid",
    "callType": "INCOMING",
    "durationSeconds": 120,
    "fileFormat": "m4a",
    "encryptedFileSize": 1048576,
    "checksumSha256": "sha256_hex_string_64_chars",
    "encryptionAlgorithm": "AES-256-GCM"
  }
  ```
- **Response (`201 Created`)**: Recording object.

### List Recordings
- **GET** `/recordings?deviceId=uuid&limit=20&offset=0`
- **Headers**: `Authorization: Bearer <accessToken>`

### Get Recording Details (with signed download URL)
- **GET** `/recordings/:id`
- **Headers**: `Authorization: Bearer <accessToken>`

### Delete Recording & Cloud Data
- **DELETE** `/recordings/:id`
- **Headers**: `Authorization: Bearer <accessToken>`

---

## 4. Upload & Verification Endpoints

### Initiate Upload Session & Get Signed URL
- **POST** `/uploads/initiate`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "deviceId": "device_uuid",
    "recordingId": "optional_recording_uuid",
    "callType": "INCOMING",
    "durationSeconds": 120,
    "encryptedFileSize": 1048576,
    "expectedChecksum": "sha256_hex_string_64_chars",
    "fileFormat": "m4a"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_uuid",
      "recordingId": "recording_uuid",
      "uploadUrl": "https://s3... or http://localhost:3000/api/v1/uploads/local/...",
      "objectKey": "recordings/user_id/device_id/timestamp_hash.m4a",
      "expiresAt": "ISO_TIMESTAMP"
    }
  }
  ```

### Complete Upload & Trigger Server-Side Verification
- **POST** `/uploads/:sessionId/complete`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Description**: Triggers independent server-side verification of object existence, file size match, and SHA-256 checksum validation.
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "sessionId": "session_uuid",
      "recordingId": "recording_uuid",
      "verificationStatus": "VERIFIED",
      "uploadStatus": "COMPLETED",
      "fileSize": 1048576,
      "checksum": "sha256..."
    }
  }
  ```

### Get Session Status
- **GET** `/uploads/:sessionId`
- **Headers**: `Authorization: Bearer <accessToken>`

### Cancel Upload Session
- **POST** `/uploads/:sessionId/cancel`
- **Headers**: `Authorization: Bearer <accessToken>`
