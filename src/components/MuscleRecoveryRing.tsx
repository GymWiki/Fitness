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
// Below this ring size the tile sits in the dashboard's compact ring row (no per-tile grid
// wrapper to constrain it, unlike the full readiness page's `gridTile`), so the label needs a
// smaller font and a tighter tile width to guarantee it never spills into the neighboring ring.
const COMPACT_THRESHOLD = 48;

export function MuscleRecoveryRing({ muscleGroup, estimate, onPress, size = 64 }: MuscleRecoveryRingProps) {
  const color = recoveryColor(estimate);
  const percent = recoveryReadinessPercent(estimate);
  const label = recoveryRingLabel(estimate);
  const isCompact = size <= COMPACT_THRESHOLD;
  // Compact tiles sit directly in the dashboard's ring row with no per-tile grid wrapper, so they
  // need their own fixed width — sized so 4 of them plus gaps still fit the narrowest supported
  // phone width (~320px). The full readiness-grid tiles already sit inside `gridTile` (31% of the
  // page width), so filling that container is enough; `numberOfLines` + ellipsis on the labels
  // handles the rest ("Klaar om te starten", "Bilspieren/Hamstrings" being the longest real values).
  const tileStyle = isCompact ? { width: Math.max(size, 52) } : { width: '100%' as const };

  const content = (
    <>
      <RecoveryRing percent={percent} color={color} size={size} />
      <Text style={[styles.muscleGroup, isCompact && styles.muscleGroupCompact]} numberOfLines={1} ellipsizeMode="tail">
        {muscleGroup}
      </Text>
      <Text style={[styles.label, isCompact && styles.labelCompact, { color }]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.tile, tileStyle]} accessibilityLabel={`${muscleGroup}: ${label}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable style={[styles.tile, tileStyle]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${muscleGroup}: ${label}`}>
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
  muscleGroupCompact: {
    fontSize: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 9,
  },
});
