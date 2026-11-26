import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../theme/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  isDarkMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, isDarkMode = false }) => {
  const colors = isDarkMode ? Theme.dark : Theme.light;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    marginTop: 2,
  },
});
