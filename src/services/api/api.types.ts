export interface User {
  id: string;
  email: string;
  account_status: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PhoneLoginRequest {
  phoneNumber: string;
}

export interface PhoneLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
}

export interface DeviceRegisterRequest {
  deviceIdentifier: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  appVersion?: string;
}

export interface DeviceResponse {
  id: string;
  userId: string;
  deviceIdentifier: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  appVersion?: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface RecordingRegisterRequest {
  deviceId: string;
  callType: string;
  durationSeconds: number;
  fileFormat?: string;
  encryptedFileSize: number;
  checksumSha256: string;
  encryptionAlgorithm?: string;
  storageObjectKey?: string;
  phoneNumber?: string;
  contactName?: string;
}

export interface RecordingResponse {
  id: string;
  userId: string;
  deviceId: string;
  callType: string;
  durationSeconds: number;
  fileFormat: string;
  encryptedFileSize: number;
  checksumSha256: string;
  encryptionAlgorithm: string;
  storageObjectKey: string;
  uploadStatus: string;
  createdAt: string;
  phoneNumber?: string;
  contactName?: string;
}

export interface UploadInitiateRequest {
  deviceId: string;
  recordingId?: string;
  callType?: string;
  durationSeconds?: number;
  encryptedFileSize: number;
  expectedChecksum: string;
  fileFormat?: string;
  phoneNumber?: string;
  contactName?: string;
}

export interface UploadInitiateResponse {
  sessionId: string;
  recordingId: string;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

export interface UploadCompleteResponse {
  success: boolean;
  sessionId: string;
  recordingId: string;
  verificationStatus: string;
  uploadStatus: string;
  fileSize: number;
  checksum: string;
}

export interface UploadStatusResponse {
  sessionId: string;
  recordingId: string;
  uploadStatus: string;
  verificationStatus?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string | number;
    message: string;
    details?: any;
  };
}
