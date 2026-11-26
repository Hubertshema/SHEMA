import { NativeModules } from 'react-native';
import { RecordingMetadata, UploadStatus } from '../../types';

const { MetadataModule } = NativeModules;

export interface StorageService {
  insertRecording(metadata: RecordingMetadata): Promise<boolean>;
  getRecordings(): Promise<RecordingMetadata[]>;
  updateUploadStatus(id: string, status: UploadStatus): Promise<boolean>;
  deleteRecording(id: string): Promise<boolean>;
  clearDatabase(): Promise<boolean>;
}

export const storageService: StorageService = {
  async insertRecording(metadata: RecordingMetadata): Promise<boolean> {
    if (!MetadataModule || !MetadataModule.insertRecording) {
      throw new Error('MetadataModule native module is not linked or available.');
    }
    return await MetadataModule.insertRecording(JSON.stringify(metadata));
  },

  async getRecordings(): Promise<RecordingMetadata[]> {
    if (!MetadataModule || !MetadataModule.getRecordings) {
      return [];
    }
    const jsonStr = await MetadataModule.getRecordings();
    try {
      return JSON.parse(jsonStr) as RecordingMetadata[];
    } catch {
      return [];
    }
  },

  async updateUploadStatus(id: string, status: UploadStatus): Promise<boolean> {
    if (!MetadataModule || !MetadataModule.updateUploadStatus) {
      return false;
    }
    return await MetadataModule.updateUploadStatus(id, status);
  },

  async deleteRecording(id: string): Promise<boolean> {
    if (!MetadataModule || !MetadataModule.deleteRecording) {
      return false;
    }
    return await MetadataModule.deleteRecording(id);
  },

  async clearDatabase(): Promise<boolean> {
    if (!MetadataModule || !MetadataModule.clearDatabase) {
      return false;
    }
    return await MetadataModule.clearDatabase();
  },
};
