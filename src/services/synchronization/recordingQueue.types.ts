export type RecordingStatus =
  | 'processing'
  | 'queued'
  | 'uploading'
  | 'upload_failed'
  | 'uploaded'
  | 'verified'
  | 'corrupted';

export interface RecordingQueueItem {
  id: string;
  deviceId: string;
  callType: 'incoming' | 'outgoing' | 'unknown';
  duration: number;
  fileFormat: string;
  encryptedFilePath: string;
  fileSize: number;
  checksum: string;
  status: RecordingStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  phoneNumber?: string;
  contactName?: string;
}
