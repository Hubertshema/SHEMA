import { NativeEventEmitter, NativeModules } from 'react-native';
import { CallEvent } from '../callDetection/callDetection.types';

const { RecordingControlModule } = NativeModules;
const eventEmitter = RecordingControlModule ? new NativeEventEmitter(RecordingControlModule) : null;

export interface RecordingCompatibilityStatus {
  phoneStatePermissionGranted: boolean;
  microphonePermissionGranted: boolean;
  monitoringEnabled: boolean;
  automaticMicrophoneEnabled: boolean;
  consentGranted: boolean;
  microphoneRecordingSupported: boolean;
  twoSidedCellularRecordingSupported: boolean;
  manufacturer: string;
  model: string;
  apiLevel: number;
  lastCallEvent?: CallEvent;
}

export const recordingControlService = {
  async getStatus(): Promise<RecordingCompatibilityStatus> {
    if (!RecordingControlModule?.getStatus) throw new Error('Recording controls are unavailable on this device.');
    return RecordingControlModule.getStatus();
  },

  async configure(monitoring: boolean, automaticMicrophone: boolean, consent: boolean): Promise<void> {
    if (!RecordingControlModule?.configure) throw new Error('Recording controls are unavailable on this device.');
    await RecordingControlModule.configure(monitoring, automaticMicrophone, consent);
  },

  onRecordingQueued(listener: (recordingId: string) => void) {
    return eventEmitter?.addListener('CallVaultRecordingQueued', (event: Object) => listener((event as { recordingId: string }).recordingId));
  },

  async getSyncNeeded(): Promise<boolean> {
    if (!RecordingControlModule?.getSyncNeeded) throw new Error('Recording controls are unavailable on this device.');
    return RecordingControlModule.getSyncNeeded();
  },

  async clearSyncNeeded(): Promise<void> {
    if (!RecordingControlModule?.clearSyncNeeded) throw new Error('Recording controls are unavailable on this device.');
    await RecordingControlModule.clearSyncNeeded();
  },

  async getDevicePhoneNumber(): Promise<string> {
    if (!RecordingControlModule?.getDevicePhoneNumber) throw new Error('Recording controls are unavailable on this device.');
    return RecordingControlModule.getDevicePhoneNumber();
  },
};
