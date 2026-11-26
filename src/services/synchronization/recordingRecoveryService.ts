import { recordingQueueRepository } from './recordingQueueRepository';
import { recordingIntegrityService } from './recordingIntegrityService';

export const recordingRecoveryService = {
  async recoverQueueOnStartup(): Promise<{ recoveredCount: number; corruptedCount: number }> {
    await recordingQueueRepository.init();
    const items = await recordingQueueRepository.getAll();
    let recoveredCount = 0;
    let corruptedCount = 0;

    for (const item of items) {
      const fileExists = await recordingIntegrityService.verifyEncryptedFile(item.encryptedFilePath);
      if (!fileExists) {
        await recordingQueueRepository.updateStatus(item.id, 'corrupted');
        corruptedCount += 1;
      } else {
        if (item.status === 'uploading' || item.status === 'processing') {
          await recordingQueueRepository.updateStatus(item.id, 'queued');
          recoveredCount += 1;
        }
      }
    }

    return { recoveredCount, corruptedCount };
  },
};
