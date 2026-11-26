import { apiClient } from './apiClient';
import { RegisterRequest, LoginRequest, AuthResponse, RefreshRequest, PhoneLoginRequest, PhoneLoginResponse } from './api.types';
import { secureStorageService } from '../secureStorage/secureStorageService';

export const authApi = {
  async register(credentials: RegisterRequest): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>('/auth/register', credentials);
    if (data.accessToken && data.refreshToken) {
      await secureStorageService.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (data.accessToken && data.refreshToken) {
      await secureStorageService.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  async phoneLogin(credentials: PhoneLoginRequest): Promise<PhoneLoginResponse> {
    const data = await apiClient.post<PhoneLoginResponse>('/auth/phone-login', credentials);
    if (data.accessToken && data.refreshToken) {
      await secureStorageService.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  async refreshToken(payload: RefreshRequest): Promise<{ accessToken: string; refreshToken: string }> {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', payload);
    if (data.accessToken && data.refreshToken) {
      await secureStorageService.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = await secureStorageService.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } finally {
      await secureStorageService.clearTokens();
    }
  },
};
