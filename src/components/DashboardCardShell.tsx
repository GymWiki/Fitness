import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Card } from './Card';

interface DashboardCardShellProps extends PropsWithChildren {
  title: string;
  icon?: ReactNode;
  isLoading: boolean;
  error?: string | null;
  onPress: () => void;
  ctaLabel: string;
}

/**
 * The one card shape every dashboard summary card renders through — same
 * `Card` component, same header layout, same loading/error handling, same
 * "whole card is the tap target" entry pattern — so the four cards read as
 * one consistent system instead of four one-off layouts. Each card owns its
 * own data fetch (see `TrainingTodayCard`/etc.), this only owns the shell.
 */
export function DashboardCardShell({ title, icon, isLoading, error, onPress, ctaLabel, children }: DashboardCardShellProps) {
  return (
    <Card style={styles.card} onPress={onPress} elevated>
      <View style={styles.headerRow}>
        {icon}
        <Text style={styles.title}>{title}</Text>
      </View>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && (
        <>
          {children}
          <Text style={styles.cta}>{ctaLabel} →</Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  cta: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
