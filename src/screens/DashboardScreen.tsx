import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, PermissionsAndroid, Platform } from 'react-native';
import { Theme } from '../theme/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RecordingMetadata } from '../types';
import { CallEvent } from '../services/callDetection/callDetection.types';
import { syncService } from '../services/synchronization/syncService';
import { storageService } from '../services/storage/storageService';
import { recordingControlService } from '../services/recording/recordingControlService';
import { recordingService } from '../services/recording/recordingService';

interface DashboardScreenProps {
  isDarkMode?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ isDarkMode = false }) => {
  const colors = isDarkMode ? Theme.dark : Theme.light;
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastCallEvent, setLastCallEvent] = useState<CallEvent | null>(null);
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [syncStatus, setSyncStatus] = useState({
    lastSyncedAt: null as string | null,
    pendingUploadsCount: 0,
    isSyncing: false,
  });

  useEffect(() => {
    initializeRecordingSupport();
    loadDashboardData();
  }, []);

  const initializeRecordingSupport = async () => {
    try {
      await recordingService.initialize();
      const status = await recordingControlService.getStatus();
      setHasPermission(status.phoneStatePermissionGranted);
      setIsListening(status.monitoringEnabled);
      setLastCallEvent(status.lastCallEvent || null);
    } catch (error) {
      console.error('Failed to initialize recording support', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
      const items = await storageService.getRecordings();
      setRecordings(items);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  };

  const handleSyncNow = async () => {
    setRefreshing(true);
    await syncService.triggerBackgroundSync();
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleRequestPermission = async () => {
    if (Platform.OS !== 'android') return;
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);
    const granted = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
    setHasPermission(granted);
    if (granted) {
      try {
        const status = await recordingControlService.getStatus();
        await recordingControlService.configure(true, status.automaticMicrophoneEnabled, status.consentGranted);
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const disableMonitoring = async () => {
    try {
      const status = await recordingControlService.getStatus();
      await recordingControlService.configure(false, false, status.consentGranted);
      setIsListening(false);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeRecordingSupport();
    await loadDashboardData();
    setRefreshing(false);
  };

  const totalUsedMb = recordings.reduce((acc, curr) => acc + (curr.fileSize || 0), 0) / (1024 * 1024);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="CallVault" subtitle="Call Detection & Secure Vault" isDarkMode={isDarkMode} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Call Detection Status Card */}
        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Android Call Detection</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: hasPermission ? colors.success : colors.warning }]}>
                {hasPermission ? 'Granted' : 'Required'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Phone State</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isListening ? colors.success : colors.textSecondary }]}>
                {isListening ? 'Active' : 'Stopped'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Monitor State</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>Mic only</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Call Audio</Text>
            </View>
          </View>

          {lastCallEvent && (
            <View style={[styles.eventBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>Last Event Detected:</Text>
              <Text style={[styles.eventText, { color: colors.primary }]}>Type: {lastCallEvent.eventType}</Text>
              <Text style={[styles.eventText, { color: colors.textSecondary }]}>
                Time: {new Date(lastCallEvent.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}

          {!hasPermission ? (
            <Button
              title="Grant Phone State Permission"
              onPress={handleRequestPermission}
              variant="primary"
              isDarkMode={isDarkMode}
              style={{ marginTop: Theme.spacing.md }}
            />
          ) : (
            <Button
              title="Disable Call Event Monitoring"
              onPress={disableMonitoring}
              variant="outline"
              isDarkMode={isDarkMode}
              style={{ marginTop: Theme.spacing.md }}
            />
          )}
        </Card>

        {/* Vault Status Card */}
        <Card isDarkMode={isDarkMode}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Vault & Cloud Sync Status</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalUsedMb.toFixed(2)} MB</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Used Storage</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>AES-256</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Encryption</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {syncStatus.isSyncing ? 'Syncing...' : `${recordings.filter(r => r.uploadStatus !== 'verified').length} Pending`}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sync Queue</Text>
            </View>
          </View>

          <Button
            title={syncStatus.isSyncing ? 'Synchronizing...' : 'Sync Vault Now'}
            onPress={handleSyncNow}
            variant="primary"
            isDarkMode={isDarkMode}
            style={{ marginTop: Theme.spacing.md }}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Encrypted Vault Records</Text>
        {recordings.length === 0 ? (
          <Card isDarkMode={isDarkMode}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No encrypted recordings in local storage yet.
            </Text>
          </Card>
        ) : (
          recordings.map((rec) => (
            <Card key={rec.id} isDarkMode={isDarkMode}>
              <View style={styles.recordHeader}>
                <Text style={[styles.contactName, { color: colors.textPrimary }]}>
                  Call Session ({rec.callType.toUpperCase()})
                </Text>
                <Text
                  style={[
                    styles.syncBadge,
                    {
                      color: rec.uploadStatus === 'verified' ? colors.success : colors.warning,
                    },
                  ]}
                >
                  {rec.uploadStatus.toUpperCase()}
                </Text>
          </View>
          <Text style={[styles.phoneNumber, { color: colors.textSecondary }]}>
            {rec.contactName ? `${rec.contactName}` : 'Unknown Contact'}
            {rec.phoneNumber && rec.phoneNumber !== 'unknown' ? ` • ${rec.phoneNumber}` : ''}
          </Text>
          <Text style={[styles.phoneNumber, { color: colors.textSecondary }]}>ID: {rec.id}</Text>
              <View style={styles.recordFooter}>
                <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                  Duration: {Math.floor(rec.duration / 60)}m {rec.duration % 60}s ({((rec.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB)
                </Text>
                <Text style={[styles.recordMeta, { color: colors.textSecondary }]}>
                  {new Date(rec.createdAt).toLocaleString()}
                </Text>
              </View>
            </Card>
          ))
        )}
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
  cardTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '700',
    marginBottom: Theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Theme.typography.sizes.xs,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '700',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
  },
  syncBadge: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
  },
  phoneNumber: {
    fontSize: Theme.typography.sizes.sm,
    marginVertical: 4,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Theme.spacing.xs,
  },
  recordMeta: {
    fontSize: Theme.typography.sizes.xs,
  },
  eventBox: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
  },
  eventTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventText: {
    fontSize: Theme.typography.sizes.xs,
  },
  emptyText: {
    textAlign: 'center',
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.sm,
  },
});
