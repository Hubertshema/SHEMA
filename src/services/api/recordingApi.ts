import { apiClient } from './apiClient';
import { RecordingRegisterRequest, RecordingResponse } from './api.types';

export const recordingApi = {
  async registerRecording(payload: RecordingRegisterRequest): Promise<RecordingResponse> {
    return await apiClient.post<RecordingResponse>('/recordings', payload);
  },

  async getRecordings(deviceId?: string, limit = 20, offset = 0): Promise<RecordingResponse[]> {
    const query = deviceId ? `?deviceId=${deviceId}&limit=${limit}&offset=${offset}` : `?limit=${limit}&offset=${offset}`;
    return await apiClient.get<RecordingResponse[]>(`/recordings${query}`);
  },

  async getRecordingById(id: string): Promise<RecordingResponse> {
    return await apiClient.get<RecordingResponse>(`/recordings/${id}`);
  },

  async deleteRecording(id: string): Promise<void> {
    await apiClient.delete(`/recordings/${id}`);
  },
};
