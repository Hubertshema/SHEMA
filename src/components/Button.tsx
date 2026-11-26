import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDarkMode?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  isDarkMode = false,
  accessibilityLabel,
}) => {
  const colors = isDarkMode ? Theme.dark : Theme.light;

  let backgroundColor = colors.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    backgroundColor = colors.secondary;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = colors.primary;
    borderColor = colors.primary;
  } else if (variant === 'danger') {
    backgroundColor = colors.error;
  }

  if (disabled) {
    backgroundColor = colors.surfaceVariant;
    textColor = colors.textSecondary;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor, borderColor },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginVertical: Theme.spacing.xs,
  },
  text: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
  },
});
