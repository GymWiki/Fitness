import type { TextStyle } from 'react-native';
import { colors } from './colors';

/** Named text presets so every screen picks from the same type scale instead of one-off font sizes. */
export const typography = {
  display: { fontSize: 28, fontWeight: '700', color: colors.textPrimary } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary } satisfies TextStyle,
  heading: { fontSize: 17, fontWeight: '700', color: colors.textPrimary } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 21, color: colors.textPrimary } satisfies TextStyle,
  bodySecondary: { fontSize: 15, lineHeight: 21, color: colors.textSecondary } satisfies TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 } satisfies TextStyle,
  caption: { fontSize: 12, color: colors.textTertiary } satisfies TextStyle,
} as const;
