import { StyleSheet, Text, View } from 'react-native';
import { describeNutrientProgress } from '@/lib/nutrientProgress';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

interface NutrientProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  /** Calories gets the larger, more prominent bar; the three macros share the smaller style. */
  size?: 'large' | 'small';
}

/**
 * Filled-track progress bar for a day's calorie/macro total vs. its target.
 * Always shows a concrete remaining amount as text ("nog 800 kcal"), never
 * only a percentage — color alone never carries the "on track vs. over
 * target" distinction. Caps the fill at 100% visually; going over target
 * switches both the fill color and the label ("12g boven doel") rather than
 * trying to render a bar past full or a negative remaining number.
 *
 * Uses `colors.progress`, a neutral blue reserved for this component —
 * deliberately not `colors.accent`/`warning`/`danger`, which already carry
 * the body diagram's recovery-status meaning elsewhere in the app.
 */
export function NutrientProgressBar({ label, current, target, unit, size = 'small' }: NutrientProgressBarProps) {
  const { percent, isOverTarget, remainingLabel } = describeNutrientProgress(current, target, unit);
  const isLarge = size === 'large';

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isLarge && styles.labelLarge]}>{label}</Text>
        <Text style={[styles.remaining, isOverTarget && styles.remainingOver, isLarge && styles.remainingLarge]}>{remainingLabel}</Text>
      </View>
      <View style={[styles.track, isLarge && styles.trackLarge]}>
        <View style={[styles.fill, { width: `${percent}%` }, isOverTarget && styles.fillOver]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  labelLarge: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  remaining: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  remainingLarge: {
    fontSize: 14,
  },
  remainingOver: {
    color: colors.danger,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  trackLarge: {
    height: 12,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.progress,
  },
  fillOver: {
    backgroundColor: colors.danger,
  },
});
