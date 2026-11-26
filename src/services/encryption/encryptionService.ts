import { NativeModules } from 'react-native';

const { SecurityModule } = NativeModules;

export interface EncryptionService {
  encryptFile(sourcePath: string, recordingId: string): Promise<string>;
  decryptFile(encryptedPath: string, destinationPath: string): Promise<string>;
  verifyEncryptedFile(encryptedPath: string): Promise<boolean>;
  deleteEncryptedFile(encryptedPath: string): Promise<void>;
}

export const encryptionService: EncryptionService = {
  async encryptFile(sourcePath: string, recordingId: string): Promise<string> {
    if (!SecurityModule || !SecurityModule.encryptFile) {
      throw new Error('SecurityModule native module is not linked or available.');
    }
    return await SecurityModule.encryptFile(sourcePath, recordingId);
  },

  async decryptFile(encryptedPath: string, destinationPath: string): Promise<string> {
    if (!SecurityModule || !SecurityModule.decryptFile) {
      throw new Error('SecurityModule native module is not linked or available.');
    }
    return await SecurityModule.decryptFile(encryptedPath, destinationPath);
  },

  async verifyEncryptedFile(encryptedPath: string): Promise<boolean> {
    if (!SecurityModule || !SecurityModule.verifyEncryptedFile) {
      return false;
    }
    return await SecurityModule.verifyEncryptedFile(encryptedPath);
  },

  async deleteEncryptedFile(encryptedPath: string): Promise<void> {
    if (!SecurityModule || !SecurityModule.deleteEncryptedFile) {
      return;
    }
    await SecurityModule.deleteEncryptedFile(encryptedPath);
  },
};
