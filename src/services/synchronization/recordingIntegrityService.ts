import { encryptionService } from '../encryption/encryptionService';
import { NativeModules } from 'react-native';

const { SecurityModule } = NativeModules;

export const recordingIntegrityService = {
  async verifyEncryptedFile(encryptedPath: string): Promise<boolean> {
    try {
      return await encryptionService.verifyEncryptedFile(encryptedPath);
    } catch {
      return false;
    }
  },

  async calculateChecksum(encryptedPath: string): Promise<string> {
    if (!SecurityModule || !SecurityModule.computeFileChecksum) {
      throw new Error('SecurityModule.computeFileChecksum is not available on this device.');
    }
    return await SecurityModule.computeFileChecksum(encryptedPath);
  },
};
