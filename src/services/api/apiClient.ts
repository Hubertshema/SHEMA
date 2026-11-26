import { secureStorageService } from '../secureStorage/secureStorageService';
import {
  ApiError,
  AuthenticationError,
  NetworkUnavailableError,
  BackendUnavailableError,
  UploadSessionExpiredError,
  ValidationError,
} from './api.errors';

// 10.0.2.2 is the host machine's loopback as seen from the Android emulator.
// On a REAL physical device you must replace this with your machine's LAN IP,
// e.g. 'http://192.168.1.X:3000/api/v1', or call apiClient.setBaseUrl(url)
// before the first API call (from Settings or app config).
const DEFAULT_BASE_URL = 'http://172.23.37.74:3000/api/v1';

let customBaseUrl: string | null = null;

export const apiClient = {
  setBaseUrl(url: string) {
    customBaseUrl = url;
  },

  getBaseUrl(): string {
    return customBaseUrl || DEFAULT_BASE_URL;
  },

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const accessToken = await secureStorageService.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error: any) {
      // Check if network error
      if (error.message?.includes('Network request failed') || error.name === 'TypeError') {
        throw new NetworkUnavailableError();
      }
      throw new BackendUnavailableError(error.message || 'Backend connection failed');
    }

    if (response.status >= 500) {
      throw new BackendUnavailableError(`Server error status: ${response.status}`, response.status);
    }

    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = {};
    }

    if (response.status === 401 && !isRetry) {
      // Attempt token refresh
      try {
        const refreshed = await this.refreshTokenFlow();
        if (refreshed) {
          return await this.request<T>(endpoint, options, true);
        }
      } catch (refreshErr) {
        await secureStorageService.clearTokens();
        throw new AuthenticationError('Session expired. Please log in again.');
      }
      throw new AuthenticationError();
    }

    if (!response.ok || data.success === false) {
      const errCode = data.error?.code || response.status;
      const errMessage = data.error?.message || data.message || `API error status ${response.status}`;
      const details = data.error?.details || data.details;

      if (response.status === 401) {
        throw new AuthenticationError(errMessage, details);
      }
      if (response.status === 410 || errCode === 'UPLOAD_SESSION_EXPIRED') {
        throw new UploadSessionExpiredError(errMessage, details);
      }
      if (response.status === 400 || errCode === 'VALIDATION_ERROR') {
        throw new ValidationError(errMessage, details);
      }
      throw new ApiError(errCode, errMessage, response.status, details);
    }

    return (data.data !== undefined ? data.data : data) as T;
  },

  async refreshTokenFlow(): Promise<boolean> {
    const refreshToken = await secureStorageService.getRefreshToken();
    if (!refreshToken) return false;

    const baseUrl = this.getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;
      const json: any = await res.json();
      const tokenData = json.data || json;

      if (tokenData.accessToken && tokenData.refreshToken) {
        await secureStorageService.setTokens(tokenData.accessToken, tokenData.refreshToken);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
