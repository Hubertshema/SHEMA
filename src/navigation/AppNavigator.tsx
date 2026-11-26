import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Theme } from '../theme/theme';

export const AppNavigator: React.FC = () => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'settings'>('dashboard');

  const colors = isDarkMode ? Theme.dark : Theme.light;

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.screenContainer}>
        {currentTab === 'dashboard' ? (
          <DashboardScreen isDarkMode={isDarkMode} />
        ) : (
          <SettingsScreen isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        )}
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('dashboard')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'dashboard' ? colors.primary : colors.textSecondary,
                fontWeight: currentTab === 'dashboard' ? '700' : '400',
              },
            ]}
          >
            🛡️ Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('settings')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: currentTab === 'settings' ? colors.primary : colors.textSecondary,
                fontWeight: currentTab === 'settings' ? '700' : '400',
              },
            ]}
          >
            ⚙️ Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: Theme.typography.sizes.md,
  },
});
