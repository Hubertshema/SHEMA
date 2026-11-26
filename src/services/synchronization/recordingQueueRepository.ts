import { storageService } from '../storage/storageService';
import { RecordingQueueItem, RecordingStatus } from './recordingQueue.types';
import { recordingQueueValidator } from './recordingQueue.validator';
import { recordingIntegrityService } from './recordingIntegrityService';

let memoryQueue: Map<string, RecordingQueueItem> = new Map();
let isInitialized = false;

export const recordingQueueRepository = {
  async init(): Promise<void> {
    if (isInitialized) return;
    try {
      const records = await storageService.getRecordings();
      for (const rec of records) {
        let checksum = 'sha256_pending';
        try {
          checksum = await recordingIntegrityService.calculateChecksum(rec.encryptedFilePath);
        } catch {
          // Keep placeholder if checksum cannot be computed
        }
        memoryQueue.set(rec.id, {
          id: rec.id,
          deviceId: 'device_default',
          callType: rec.callType || 'unknown',
          duration: rec.duration || 0,
          fileFormat: rec.fileFormat || 'm4a',
          encryptedFilePath: rec.encryptedFilePath,
          fileSize: rec.fileSize || 0,
          checksum,
          status: (rec.uploadStatus === 'verified' ? 'verified' : 'queued') as RecordingStatus,
          retryCount: 0,
          createdAt: rec.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          phoneNumber: rec.phoneNumber || '',
          contactName: rec.contactName || '',
        });
      }
      isInitialized = true;
    } catch (e) {
      console.error('Failed to initialize queue repository', e);
    }
  },

  async add(item: RecordingQueueItem): Promise<boolean> {
    await this.init();
    if (!recordingQueueValidator.validateItem(item)) {
      throw new Error('Invalid recording queue item validation failed.');
    }
    if (memoryQueue.has(item.id)) {
      return false;
    }
    memoryQueue.set(item.id, item);
    await storageService.insertRecording({
      id: item.id,
      callType: item.callType,
      duration: item.duration,
      fileFormat: item.fileFormat,
      encryptedFilePath: item.encryptedFilePath,
      fileSize: item.fileSize,
      uploadStatus: item.status === 'verified' ? 'verified' : 'queued',
      createdAt: item.createdAt,
      phoneNumber: item.phoneNumber || '',
      contactName: item.contactName || '',
    });
    return true;
  },

  async getAll(): Promise<RecordingQueueItem[]> {
    await this.init();
    return Array.from(memoryQueue.values());
  },

  async getById(id: string): Promise<RecordingQueueItem | null> {
    await this.init();
    return memoryQueue.get(id) || null;
  },

  async updateStatus(id: string, status: RecordingStatus): Promise<boolean> {
    await this.init();
    const item = memoryQueue.get(id);
    if (!item) return false;

    if (!recordingQueueValidator.isValidTransition(item.status, status)) {
      throw new Error(`Invalid state transition from ${item.status} to ${status}`);
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === 'uploading') {
      item.lastAttemptAt = item.updatedAt;
    } else if (status === 'uploaded') {
      item.uploadedAt = item.updatedAt;
    } else if (status === 'verified') {
      item.verifiedAt = item.updatedAt;
    }
    memoryQueue.set(id, item);

    await storageService.updateUploadStatus(
      id,
      status === 'verified' ? 'verified' : status === 'uploaded' ? 'uploaded' : 'queued'
    );
    return true;
  },

  async incrementRetry(id: string): Promise<void> {
    await this.init();
    const item = memoryQueue.get(id);
    if (item) {
      item.retryCount += 1;
      item.updatedAt = new Date().toISOString();
      memoryQueue.set(id, item);
    }
  },

  async remove(id: string): Promise<boolean> {
    await this.init();
    const item = memoryQueue.get(id);
    if (!item) return false;
    memoryQueue.delete(id);
    await storageService.deleteRecording(id);
    return true;
  },

  async clear(): Promise<boolean> {
    await this.init();
    memoryQueue.clear();
    return await storageService.clearDatabase();
  },
};
