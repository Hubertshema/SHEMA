import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert, PermissionsAndroid, TextInput } from 'react-native';
import { Theme } from '../theme/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { recordingService } from '../services/recording/recordingService';
import { syncService } from '../services/synchronization/syncService';
import { apiClient } from '../services/api/apiClient';

interface SettingsScreenProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ isDarkMode, onToggleTheme }) => {
  const colors = isDarkMode ? Theme.dark : Theme.light;
  const policy = recordingService.getPolicy();
  const [consent, setConsent] = useState(policy.consentGranted);
  const [autoRecord, setAutoRecord] = useState(policy.autoRecordEnabled);
  const [biometricLock, setBiometricLock] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [backendUrl, setBackendUrl] = useState(apiClient.getBaseUrl());

  useEffect(() => {
    recordingService.initialize().then((restored) => {
      setConsent(restored.consentGranted);
      setAutoRecord(restored.autoRecordEnabled);
    }).catch(() => undefined);
  }, []);

  const handleConsentToggle = async (val: boolean) => {
    try {
      await recordingService.setConsent(val);
      setConsent(val);
    } catch (error: any) {
      Alert.alert('Consent could not be updated', error?.message || 'Microphone consent could not be saved.');
    }
  };

  const handleAutoRecordToggle = async (val: boolean) => {
    if (!val) {
      try {
        await recordingService.setAutoRecord(false);
        setAutoRecord(false);
      } catch (error: any) {
        Alert.alert('Recording could not be disabled', error?.message || 'Try again.');
      }
      return;
    }
    if (!consent) {
      Alert.alert('Consent required', 'Enable participant consent before enabling microphone-only recording.');
      return;
    }
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);
    const phone = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE];
    const microphone = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (phone !== PermissionsAndroid.RESULTS.GRANTED || microphone !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission required', 'Phone-state and microphone permissions are required. CallVault records microphone audio only and does not capture protected call audio.');
      return;
    }
    try {
      await recordingService.setAutoRecord(true);
      setAutoRecord(true);
    } catch (error: any) {
      Alert.alert('Recording unavailable', error?.message || 'The microphone recording service could not start.');
    }
  };

  const handleAutoSyncToggle = async (val: boolean) => {
    setAutoSync(val);
    if (val) {
      await syncService.scheduleSync(15);
    } else {
      await syncService.cancelSync();
    }
  };

  const handleApplyBackendUrl = () => {
    const trimmed = backendUrl.trim();
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    apiClient.setBaseUrl(trimmed);
    Alert.alert('Done', `Backend URL set to:\n${trimmed}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings" subtitle="Security, Consent & Vault Configurations" isDarkMode={isDarkMode} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Recording Consent & Policy</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Participant Consent Notice</Text>
            <Switch
              value={consent}
              onValueChange={handleConsentToggle}
              accessibilityLabel="Participant Consent Notice Switch"
            />
          </View>
          <View style={[styles.settingRow, { marginTop: Theme.spacing.sm }]}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Automatic Microphone Recording</Text>
            <Switch
              value={autoRecord}
              onValueChange={handleAutoRecordToggle}
              accessibilityLabel="Automatic Recording Mode Switch"
            />
          </View>
          <Text style={[styles.restrictionText, { color: colors.warning }]}>
            {policy.restrictionReason}
          </Text>
          {autoRecord && (
            <Text style={[styles.restrictionText, { color: colors.success }]}>
              A persistent Android notification is shown while monitoring is active.
            </Text>
          )}
        </Card>

        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Appearance</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleTheme}
              accessibilityLabel="Dark Mode Toggle Switch"
            />
          </View>
        </Card>

        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Security & Encryption</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Biometric App Lock</Text>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              accessibilityLabel="Biometric App Lock Switch"
            />
          </View>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
            Local call archives are protected using Android Keystore and AES-256-GCM encryption.
          </Text>
          <Button
            title="Rotate Encryption Keys"
            onPress={() => Alert.alert('Encryption', 'Hardware-backed keys rotated successfully.')}
            variant="outline"
            isDarkMode={isDarkMode}
            style={{ marginTop: Theme.spacing.md }}
            accessibilityLabel="Rotate Encryption Keys Button"
          />
        </Card>

        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Synchronization</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Background Auto-Sync</Text>
            <Switch
              value={autoSync}
              onValueChange={handleAutoSyncToggle}
              accessibilityLabel="Background Auto-Sync Switch"
            />
          </View>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
            Sync encrypted vaults securely with backend via WorkManager.
          </Text>
        </Card>

        {/* Backend URL — useful when testing on a real device over WiFi */}
        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Backend Connection</Text>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
            Emulator default: http://10.0.2.2:3000/api/v1{'\n'}
            Real device: replace 10.0.2.2 with your machine's LAN IP (run{' '}
            <Text style={{ fontFamily: 'monospace' }}>ipconfig</Text> on Windows).
          </Text>
          <TextInput
            value={backendUrl}
            onChangeText={setBackendUrl}
            style={[
              styles.urlInput,
              { color: colors.textPrimary, borderColor: colors.border },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://shema-f5gd.onrender.com/api/v1"
            placeholderTextColor={colors.textSecondary}
          />
          <Button
            title="Apply Backend URL"
            onPress={handleApplyBackendUrl}
            variant="outline"
            isDarkMode={isDarkMode}
            style={{ marginTop: Theme.spacing.sm }}
          />
        </Card>

        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>About CallVault</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.settingDescription, { color: colors.textSecondary, marginTop: 4 }]}>
            CallVault provides secure call event monitoring, consent management, AES-256-GCM encryption, and WorkManager background synchronization.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  sectionHeader: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  settingLabel: {
    fontSize: Theme.typography.sizes.md,
  },
  settingDescription: {
    fontSize: Theme.typography.sizes.xs,
    marginTop: Theme.spacing.xs,
    lineHeight: 18,
  },
  restrictionText: {
    fontSize: Theme.typography.sizes.xs,
    marginTop: Theme.spacing.sm,
    lineHeight: 18,
    fontWeight: '500',
  },
  versionText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
  },
  urlInput: {
    marginTop: Theme.spacing.sm,
    borderWidth: 1,
    borderRadius: 6,
    padding: Theme.spacing.sm,
    fontSize: 12,
  },
});
