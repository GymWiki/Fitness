import type { RecoveryEstimate } from '@fitness/progression-engine';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { recoveryColor } from '@/lib/recoveryColor';
import { recoveryReadinessPercent, recoveryRingLabel } from '@/lib/recoveryReadiness';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { RecoveryRing } from './RecoveryRing';

interface MuscleRecoveryRingProps {
  muscleGroup: string;
  estimate: RecoveryEstimate;
  /** Omit when this tile sits inside another element that already handles the tap (e.g. the compact dashboard card, whose whole `Card` navigates onward) — nesting a second `Pressable` inside that one is what React Native's touch handling doesn't do well. */
  onPress?: () => void;
  size?: number;
}

/**
 * One tile in the readiness grid: ring + muscle group name + status label.
 * Color is never the only signal — the status label is always shown as
 * text alongside the ring, same accessibility rule as the earlier
 * body-diagram illustration it replaces.
 */
export function MuscleRecoveryRing({ muscleGroup, estimate, onPress, size = 64 }: MuscleRecoveryRingProps) {
  const color = recoveryColor(estimate);
  const percent = recoveryReadinessPercent(estimate);
  const label = recoveryRingLabel(estimate);

  const content = (
    <>
      <RecoveryRing percent={percent} color={color} size={size} />
      <Text style={styles.muscleGroup} numberOfLines={1}>
        {muscleGroup}
      </Text>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.tile} accessibilityLabel={`${muscleGroup}: ${label}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable style={styles.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${muscleGroup}: ${label}`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  muscleGroup: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
