export type RecordingSessionState =
  | 'IDLE'
  | 'CONSENT_PENDING'
  | 'READY'
  | 'RECORDING'
  | 'FINALIZING'
  | 'ENCRYPTING'
  | 'COMPLETED'
  | 'FAILED';

export interface RecordingPolicy {
  consentGranted: boolean;
  autoRecordEnabled: boolean;
  deviceSupported: boolean;
  restrictionReason: string;
  microphonePermissionGranted?: boolean;
  monitoringEnabled?: boolean;
}

export interface RecordingSession {
  sessionId: string;
  state: RecordingSessionState;
  startTime?: number;
  endTime?: number;
  filePath?: string;
  encryptedPath?: string;
  error?: string;
}
