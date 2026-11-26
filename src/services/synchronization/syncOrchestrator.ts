import { recordingQueueService } from './recordingQueueService';
import { recordingDeletionService } from './recordingDeletionService';
import { deviceApi } from '../api/deviceApi';
import { recordingApi } from '../api/recordingApi';
import { uploadApi } from '../api/uploadApi';
import { recordingControlService } from '../recording/recordingControlService';
import { secureStorageService } from '../secureStorage/secureStorageService';
import { authApi } from '../api/authApi';
import { Platform } from 'react-native';

let isSyncing = false;
let lastSyncedAt: string | null = null;

const MAX_RETRIES = 3;

export const syncOrchestrator = {
  async syncNow(): Promise<{ successCount: number; failureCount: number }> {
    if (isSyncing) {
      return { successCount: 0, failureCount: 0 };
    }
    isSyncing = true;
    let successCount = 0;
    let failureCount = 0;

    try {
      let accessToken = await secureStorageService.getAccessToken();
      if (!accessToken) {
        try {
          const phoneNumber = await recordingControlService.getDevicePhoneNumber();
          const loginIdentifier = phoneNumber && phoneNumber.trim() !== '' ? phoneNumber.trim() : `${Platform.OS}_device`;
          const authRes = await authApi.phoneLogin({ phoneNumber: loginIdentifier });
          accessToken = authRes.accessToken || null;
        } catch (authErr) {
          console.warn('Auto-authentication failed before sync:', authErr);
          return { successCount: 0, failureCount: 0 };
        }
      }

      let deviceId = 'device_default';
      try {
        const deviceRes = await deviceApi.registerOrUpdateDevice({
          deviceIdentifier: Platform.OS + '_device',
          deviceName: 'Android Device',
          manufacturer: 'Unknown',
          model: 'Unknown',
          androidVersion: Platform.Version?.toString() || '14',
          appVersion: '1.0.0',
        });
        if (deviceRes && deviceRes.id) {
          deviceId = deviceRes.id;
        }
      } catch (devErr) {
        console.warn('Device registration skipped/failed during sync, proceeding with default device', devErr);
      }

      const queuedItems = await recordingQueueService.getQueuedRecordings();

      for (const item of queuedItems) {
        if (item.retryCount >= MAX_RETRIES) {
          console.warn(`Skipping recording ${item.id}: max retries (${MAX_RETRIES}) exceeded`);
          await recordingQueueService.updateStatus(item.id, 'upload_failed');
          failureCount++;
          continue;
        }
        try {
          await recordingQueueService.updateStatus(item.id, 'uploading');

          const regRes = await recordingApi.registerRecording({
            deviceId,
            callType: item.callType.toUpperCase(),
            durationSeconds: item.duration,
            fileFormat: item.fileFormat,
            encryptedFileSize: item.fileSize,
            checksumSha256: item.checksum,
            encryptionAlgorithm: 'AES-256-GCM',
            phoneNumber: item.phoneNumber || '',
            contactName: item.contactName || '',
          });

          const recordingUuid = regRes.id;

          const initiateRes = await uploadApi.initiateUpload({
            deviceId,
            recordingId: recordingUuid,
            callType: item.callType.toUpperCase(),
            durationSeconds: item.duration,
            encryptedFileSize: item.fileSize,
            expectedChecksum: item.checksum,
            fileFormat: item.fileFormat,
          });

          const sessionId = initiateRes.sessionId;
          const uploadUrl = initiateRes.uploadUrl;

          await uploadApi.uploadFileToSignedUrl(uploadUrl, item.encryptedFilePath, item.fileSize);
          await recordingQueueService.updateStatus(item.id, 'uploaded');

          const completeRes = await uploadApi.completeUpload(sessionId);

          const isVerified =
            completeRes.success &&
            (completeRes.verificationStatus === 'VERIFIED' || completeRes.uploadStatus === 'COMPLETED');

          if (isVerified) {
            await recordingQueueService.updateStatus(item.id, 'verified');
            await recordingDeletionService.authorizeAndExecuteDeletion(item.id, true);
            successCount++;
          } else {
            await recordingQueueService.incrementRetryCount(item.id);
            await recordingQueueService.updateStatus(item.id, 'upload_failed');
            failureCount++;
          }
        } catch (itemErr) {
          console.error(`Failed to sync recording ${item.id}:`, itemErr);
          await recordingQueueService.incrementRetryCount(item.id);
          try {
            await recordingQueueService.updateStatus(item.id, 'upload_failed');
          } catch {
            // ignore
          }
          failureCount++;
        }
      }

      lastSyncedAt = new Date().toISOString();
    } catch (syncErr) {
      console.error('Synchronization orchestration error:', syncErr);
    } finally {
      isSyncing = false;
    }

    if (successCount > 0) {
      try {
        await recordingControlService.clearSyncNeeded();
      } catch {
        // Ignore clear failures
      }
    }

    return { successCount, failureCount };
  },

  isSyncing(): boolean {
    return isSyncing;
  },

  getLastSyncedAt(): string | null {
    return lastSyncedAt;
  },
};
