import { LightColors, DarkColors } from './colors';
import { Typography } from './typography';

export const Theme = {
  light: LightColors,
  dark: DarkColors,
  typography: Typography,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },
};

export type ThemeColors = typeof LightColors;
