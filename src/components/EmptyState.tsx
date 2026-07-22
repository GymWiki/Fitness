import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface EmptyStateProps {
  title: string;
  body: string;
}

/** Friendly explanation instead of a blank screen when a section has no data yet. */
export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      <Text style={[typography.bodySecondary, styles.body]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
