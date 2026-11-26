import { NativeModules } from 'react-native';

const { SecurityModule } = NativeModules;

declare global {
  var _callvault_access_token: string | undefined;
  var _callvault_refresh_token: string | undefined;
}

export const secureStorageService = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      if (SecurityModule && SecurityModule.storeSecureString) {
        await SecurityModule.storeSecureString('access_token', accessToken);
        await SecurityModule.storeSecureString('refresh_token', refreshToken);
        return;
      }
    } catch (e) {
      console.warn('Native secure storage failed, falling back to memory', e);
    }
    globalThis._callvault_access_token = accessToken;
    globalThis._callvault_refresh_token = refreshToken;
  },

  async getAccessToken(): Promise<string | null> {
    try {
      if (SecurityModule && SecurityModule.getSecureString) {
        const token = await SecurityModule.getSecureString('access_token');
        if (token) return token;
      }
    } catch (e) {
      console.warn('Native secure storage get failed', e);
    }
    return globalThis._callvault_access_token || null;
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (SecurityModule && SecurityModule.getSecureString) {
        const token = await SecurityModule.getSecureString('refresh_token');
        if (token) return token;
      }
    } catch (e) {
      console.warn('Native secure storage get refresh failed', e);
    }
    return globalThis._callvault_refresh_token || null;
  },

  async clearTokens(): Promise<void> {
    try {
      if (SecurityModule && SecurityModule.removeSecureString) {
        await SecurityModule.removeSecureString('access_token');
        await SecurityModule.removeSecureString('refresh_token');
      }
    } catch (e) {
      console.warn('Native secure storage clear failed', e);
    }
    globalThis._callvault_access_token = undefined;
    globalThis._callvault_refresh_token = undefined;
  },
};
