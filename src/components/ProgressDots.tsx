import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/** Step-progress indicator for short wizards (onboarding). */
export function ProgressDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index === currentIndex && styles.dotActive, index < currentIndex && styles.dotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotDone: {
    backgroundColor: colors.borderStrong,
  },
});
