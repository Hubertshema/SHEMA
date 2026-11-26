import { RecordingQueueItem, RecordingStatus } from './recordingQueue.types';

const VALID_STATUSES: RecordingStatus[] = [
  'processing',
  'queued',
  'uploading',
  'upload_failed',
  'uploaded',
  'verified',
  'corrupted',
];

export const recordingQueueValidator = {
  validateItem(item: RecordingQueueItem): boolean {
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.encryptedFilePath || typeof item.encryptedFilePath !== 'string') return false;
    if (!VALID_STATUSES.includes(item.status)) return false;
    if (typeof item.duration !== 'number' || item.duration < 0) return false;
    if (typeof item.fileSize !== 'number' || item.fileSize < 0) return false;
    return true;
  },

  isValidTransition(currentStatus: RecordingStatus, newStatus: RecordingStatus): boolean {
    if (currentStatus === newStatus) return true;
    switch (currentStatus) {
      case 'processing':
        return newStatus === 'queued' || newStatus === 'corrupted';
      case 'queued':
        return newStatus === 'uploading' || newStatus === 'corrupted';
      case 'uploading':
        return newStatus === 'uploaded' || newStatus === 'upload_failed';
      case 'upload_failed':
        return newStatus === 'queued' || newStatus === 'corrupted';
      case 'uploaded':
        return newStatus === 'verified' || newStatus === 'upload_failed';
      case 'verified':
        return newStatus === 'verified';
      case 'corrupted':
        return false;
      default:
        return false;
    }
  },
};
