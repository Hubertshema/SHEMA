import { RecordingQueueItem, RecordingStatus } from './recordingQueue.types';
import { recordingQueueRepository } from './recordingQueueRepository';
import { recordingIntegrityService } from './recordingIntegrityService';
import { recordingQueueValidator } from './recordingQueue.validator';

export const recordingQueueService = {
  async addCompletedRecording(
    id: string,
    encryptedFilePath: string,
    duration: number,
    fileSize: number,
    callType: 'incoming' | 'outgoing' | 'unknown'
  ): Promise<string> {
    const exists = await recordingIntegrityService.verifyEncryptedFile(encryptedFilePath);
    if (!exists) {
      throw new Error(`Encrypted file missing or invalid at: ${encryptedFilePath}`);
    }

    const checksum = await recordingIntegrityService.calculateChecksum(encryptedFilePath);

    const newItem: RecordingQueueItem = {
      id,
      deviceId: 'device_default',
      callType,
      duration,
      fileFormat: 'm4a',
      encryptedFilePath,
      fileSize,
      checksum,
      status: 'queued',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!recordingQueueValidator.validateItem(newItem)) {
      throw new Error('New recording item failed validation.');
    }

    const added = await recordingQueueRepository.add(newItem);
    if (!added) {
      throw new Error(`Duplicate recording ID rejected: ${id}`);
    }

    return newItem.id;
  },

  async getQueuedRecordings(): Promise<RecordingQueueItem[]> {
    const items = await recordingQueueRepository.getAll();
    return items.filter((i) => i.status === 'queued' || i.status === 'upload_failed');
  },

  async getRecordingById(id: string): Promise<RecordingQueueItem | null> {
    return await recordingQueueRepository.getById(id);
  },

  async updateStatus(id: string, status: RecordingStatus): Promise<void> {
    await recordingQueueRepository.updateStatus(id, status);
  },

  async incrementRetryCount(id: string): Promise<void> {
    await recordingQueueRepository.incrementRetry(id);
  },

  async markAsUploaded(id: string): Promise<void> {
    await recordingQueueRepository.updateStatus(id, 'uploaded');
  },

  async markAsVerified(id: string): Promise<void> {
    await recordingQueueRepository.updateStatus(id, 'verified');
  },
};
