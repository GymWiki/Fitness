import type { RecoveryStatus } from '@fitness/progression-engine';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const STATUS_COLOR: Record<RecoveryStatus, string> = {
  recovering: colors.danger,
  ready: colors.accent,
  window_closing: colors.warning,
  window_passed: colors.textTertiary,
  no_data: colors.accent,
};

const STATUS_LABEL: Record<RecoveryStatus, string> = {
  recovering: 'Herstellend',
  ready: 'Hersteld',
  window_closing: 'Venster sluit',
  window_passed: 'Venster voorbij',
  no_data: 'Klaar om te starten',
};

/** Small colored dot + label — a "traffic light" reading of where a muscle group sits in its supercompensation cycle. */
export function RecoveryIndicator({ status }: { status: RecoveryStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
