export type CallType = 'incoming' | 'outgoing' | 'unknown';

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'failed'
  | 'uploaded'
  | 'verified';

export interface RecordingMetadata {
  id: string;
  callType: CallType;
  duration: number;
  fileFormat: string;
  encryptedFilePath: string;
  fileSize: number;
  uploadStatus: UploadStatus;
  createdAt: string;
  uploadedAt?: string;
  verifiedAt?: string;
  phoneNumber?: string;
  contactName?: string;
}

export interface CallRecordSummary {
  id: string;
  phoneNumber: string;
  contactName?: string;
  durationSeconds: number;
  timestamp: string;
  isEncrypted: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  fileSizeMb: number;
}

export interface SyncStatusState {
  lastSyncedAt: string | null;
  pendingUploadsCount: number;
  isSyncing: boolean;
}

export interface StorageStatusState {
  totalStorageMb: number;
  usedStorageMb: number;
  encryptedVaultsCount: number;
}
