import type { RecoveryStatus } from '@fitness/progression-engine';
import { StyleSheet, Text, View } from 'react-native';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

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
