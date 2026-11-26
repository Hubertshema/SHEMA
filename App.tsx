import React, { useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  useColorScheme,
  NativeEventEmitter,
  NativeModules,
  AppState,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { recordingControlService } from './src/services/recording/recordingControlService';
import { syncService } from './src/services/synchronization/syncService';
import { authApi } from './src/services/api/authApi';
import { deviceApi } from './src/services/api/deviceApi';

const { RecordingControlModule } = NativeModules;
const syncEventEmitter = RecordingControlModule
  ? new NativeEventEmitter(RecordingControlModule)
  : null;

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  // useState (not useRef) so that setting true actually triggers a re-render
  const [initialized, setInitialized] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const subscription = recordingControlService.onRecordingQueued(() => {
      syncService.triggerBackgroundSync().catch(() => undefined);
    });

    const syncSubscription = syncEventEmitter?.addListener(
      'CallVaultBackgroundSyncNeeded',
      () => {
        syncService.triggerBackgroundSync().catch(() => undefined);
      },
    );

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active' && initializedRef.current) {
          syncService.triggerBackgroundSync().catch(() => undefined);
        }
      },
    );

    // Auto-register user and device on first launch, then check pending sync
    const initializeApp = async () => {
      try {
        // Get device phone number (or Android ID fallback) for auto-registration
        const phoneNumber =
          await recordingControlService.getDevicePhoneNumber();
        const loginIdentifier =
          phoneNumber && phoneNumber.trim() !== ''
            ? phoneNumber.trim()
            : `${Platform.OS}_device`;

        try {
          const authResult = await authApi.phoneLogin({
            phoneNumber: loginIdentifier,
          });
          if (authResult.accessToken && authResult.refreshToken) {
            // Auto-register device after successful auth
            try {
              await deviceApi.registerOrUpdateDevice({
                deviceIdentifier: Platform.OS + '_device',
                deviceName: 'Android Device',
                manufacturer: 'Unknown',
                model: 'Unknown',
                androidVersion: Platform.Version?.toString() || '14',
                appVersion: '1.0.0',
              });
            } catch {
              // Device registration non-fatal
            }
          }
        } catch {
          // Auth registration non-fatal on first launch; will retry
        }

        // Check for pending background sync (worker ran while app was closed)
        try {
          const needed = await recordingControlService.getSyncNeeded();
          if (needed) {
            await syncService.triggerBackgroundSync();
          }
        } catch {
          // Ignore sync check failures when offline
        }
      } catch {
        // Initialization failures are non-fatal
      } finally {
        initializedRef.current = true;
        setInitialized(true); // triggers re-render so the UI appears
      }
    };

    initializeApp();

    return () => {
      subscription?.remove();
      syncSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  if (!initialized) {
    // Show a neutral splash while background init runs (instead of blank screen)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
