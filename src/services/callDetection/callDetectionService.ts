import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { CallEvent, CallEventListener } from './callDetection.types';
import { CALL_DETECTION_EVENTS } from './callDetection.constants';

const { CallDetectionModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(CallDetectionModule);

export const callDetectionService = {
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!CallDetectionModule || !CallDetectionModule.checkPermissions) return false;
    return await CallDetectionModule.checkPermissions();
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'CallVault Phone State Permission',
          message: 'CallVault requires access to phone state to detect call events and protect your encrypted vault archives.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  },

  async startListening(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!CallDetectionModule || !CallDetectionModule.startListening) {
      throw new Error('CallDetectionModule is not available');
    }
    return await CallDetectionModule.startListening();
  },

  async stopListening(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!CallDetectionModule || !CallDetectionModule.stopListening) {
      return false;
    }
    return await CallDetectionModule.stopListening();
  },

  addListener(listener: CallEventListener) {
    return eventEmitter.addListener(CALL_DETECTION_EVENTS.CALL_STATE_CHANGED, (event: Object) => {
      listener(event as CallEvent);
    });
  },
};
