import { apiClient } from './apiClient';
import { DeviceRegisterRequest, DeviceResponse } from './api.types';

export const deviceApi = {
  async registerOrUpdateDevice(payload: DeviceRegisterRequest): Promise<DeviceResponse> {
    return await apiClient.post<DeviceResponse>('/devices', payload);
  },

  async getDevices(): Promise<DeviceResponse[]> {
    return await apiClient.get<DeviceResponse[]>('/devices');
  },

  async revokeDevice(deviceId: string): Promise<void> {
    await apiClient.delete(`/devices/${deviceId}`);
  },
};
