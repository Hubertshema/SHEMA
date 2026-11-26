import { recordingQueueRepository } from './recordingQueueRepository';
import { encryptionService } from '../encryption/encryptionService';

export const recordingDeletionService = {
  async authorizeAndExecuteDeletion(id: string, serverVerified: boolean): Promise<boolean> {
    const item = await recordingQueueRepository.getById(id);
    if (!item) return false;

    if (!serverVerified || item.status !== 'verified') {
      throw new Error(`Deletion unauthorized: Recording ${id} is not verified by server.`);
    }

    try {
      await encryptionService.deleteEncryptedFile(item.encryptedFilePath);
    } catch (e) {
      console.error('Failed to delete physical encrypted file', e);
    }

    await recordingQueueRepository.remove(id);
    return true;
  },
};
