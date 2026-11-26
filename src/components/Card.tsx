import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  isDarkMode?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, isDarkMode = false }) => {
  const colors = isDarkMode ? Theme.dark : Theme.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    padding: Theme.spacing.md,
    marginVertical: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
