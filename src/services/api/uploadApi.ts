import { apiClient } from './apiClient';
import { NativeModules } from 'react-native';
import {
  UploadInitiateRequest,
  UploadInitiateResponse,
  UploadCompleteResponse,
  UploadStatusResponse,
} from './api.types';

const { SecurityModule } = NativeModules;

export const uploadApi = {
  async initiateUpload(payload: UploadInitiateRequest): Promise<UploadInitiateResponse> {
    return await apiClient.post<UploadInitiateResponse>('/uploads/initiate', payload);
  },

  async completeUpload(sessionId: string): Promise<UploadCompleteResponse> {
    return await apiClient.post<UploadCompleteResponse>(`/uploads/${sessionId}/complete`);
  },

  async getStatus(sessionId: string): Promise<UploadStatusResponse> {
    return await apiClient.get<UploadStatusResponse>(`/uploads/${sessionId}`);
  },

  async cancelUpload(sessionId: string): Promise<void> {
    return await apiClient.post<UploadStatusResponse>(`/uploads/${sessionId}/cancel`) as any;
  },

  async uploadFileToSignedUrl(params: {
    uploadUrl: string;
    filePath: string;
    fileSize: number;
    signature?: string;
    timestamp?: number;
    apiKey?: string;
    folder?: string;
    resourceType?: string;
    publicId?: string;
  }): Promise<void> {
    if (!SecurityModule || !SecurityModule.uploadFileToUrl) {
      throw new Error('SecurityModule.uploadFileToUrl is not available on this device.');
    }
    await SecurityModule.uploadFileToUrl(
      params.filePath,
      params.uploadUrl,
      params.signature || '',
      params.timestamp || 0,
      params.apiKey || '',
      params.folder || 'callvault',
      params.resourceType || 'auto',
      params.publicId || params.filePath,
    );
  },
};
