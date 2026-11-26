import { Platform } from 'react-native';
import { RecordingPolicy, RecordingSession, RecordingSessionState } from './recording.types';
import { RECORDING_CONSTANTS } from './recording.constants';
import { recordingControlService } from './recordingControlService';

let currentPolicy: RecordingPolicy = {
  consentGranted: false,
  autoRecordEnabled: false,
  deviceSupported: false,
  restrictionReason: RECORDING_CONSTANTS.RESTRICTION_MESSAGE,
};

let currentSession: RecordingSession = {
  sessionId: 'none',
  state: 'IDLE',
};

export const recordingService = {
  getPolicy(): RecordingPolicy {
    return { ...currentPolicy };
  },

  async initialize(): Promise<RecordingPolicy> {
    const status = await recordingControlService.getStatus();
    currentPolicy = {
      consentGranted: status.consentGranted,
      autoRecordEnabled: status.automaticMicrophoneEnabled,
      deviceSupported: status.microphoneRecordingSupported,
      restrictionReason: RECORDING_CONSTANTS.RESTRICTION_MESSAGE,
      microphonePermissionGranted: status.microphonePermissionGranted,
      monitoringEnabled: status.monitoringEnabled,
    };
    // Restores the visible foreground service only after the app is foregrounded.
    if (status.automaticMicrophoneEnabled && status.consentGranted && status.microphonePermissionGranted) {
      await recordingControlService.configure(true, true, true);
    }
    return this.getPolicy();
  },

  async setConsent(granted: boolean): Promise<void> {
    currentPolicy.consentGranted = granted;
    await recordingControlService.configure(
      currentPolicy.monitoringEnabled ?? true,
      granted && currentPolicy.autoRecordEnabled,
      granted
    );
  },

  async setAutoRecord(enabled: boolean): Promise<void> {
    currentPolicy.autoRecordEnabled = enabled;
    await recordingControlService.configure(
      currentPolicy.monitoringEnabled ?? true,
      enabled,
      currentPolicy.consentGranted
    );
  },

  getSession(): RecordingSession {
    return { ...currentSession };
  },

  async checkDeviceRecordingSupport(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const status = await recordingControlService.getStatus();
    currentPolicy.deviceSupported = status.microphoneRecordingSupported;
    currentPolicy.microphonePermissionGranted = status.microphonePermissionGranted;
    currentPolicy.monitoringEnabled = status.monitoringEnabled;
    currentPolicy.restrictionReason = RECORDING_CONSTANTS.RESTRICTION_MESSAGE;
    return status.microphoneRecordingSupported;
  },
};
