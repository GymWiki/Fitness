import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

interface NutrientProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  accentColor?: string;
}

/** Simple filled-track progress bar for a day's calorie/macro total vs. its target. Caps the fill at 100% visually — going over the target is shown by the number, not an overflowing bar. */
export function NutrientProgressBar({ label, current, target, unit, accentColor }: NutrientProgressBarProps) {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(current)}{unit} / {Math.round(target)}{unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }, accentColor ? { backgroundColor: accentColor } : null]} />
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
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
