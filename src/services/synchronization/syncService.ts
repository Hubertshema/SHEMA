import { syncOrchestrator } from './syncOrchestrator';
import { recordingQueueService } from './recordingQueueService';
import { NativeModules } from 'react-native';

const { WorkManagerModule } = NativeModules;

export const syncService = {
  async triggerBackgroundSync(): Promise<boolean> {
    try {
      if (WorkManagerModule && WorkManagerModule.triggerImmediateSync) {
        await WorkManagerModule.triggerImmediateSync();
      }
      await syncOrchestrator.syncNow();
      return true;
    } catch (e) {
      console.error('Trigger background sync failed', e);
      return false;
    }
  },

  async scheduleSync(intervalMinutes: number = 15): Promise<boolean> {
    try {
      if (WorkManagerModule && WorkManagerModule.scheduleSync) {
        await WorkManagerModule.scheduleSync(intervalMinutes);
        return true;
      }
    } catch (e) {
      console.error('Schedule sync failed', e);
    }
    return false;
  },

  async cancelSync(): Promise<boolean> {
    try {
      if (WorkManagerModule && WorkManagerModule.cancelSync) {
        await WorkManagerModule.cancelSync();
        return true;
      }
    } catch (e) {
      console.error('Cancel sync failed', e);
    }
    return false;
  },

  async getSyncStatus() {
    const queued = await recordingQueueService.getQueuedRecordings();
    return {
      lastSyncedAt: syncOrchestrator.getLastSyncedAt(),
      pendingUploadsCount: queued.length,
      isSyncing: syncOrchestrator.isSyncing(),
    };
  },
};
