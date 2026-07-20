import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import type { SyncStatus } from '@/lib/useSyncStatus';

/** Subtle sync indicator: offline takes priority, then a pending count, then a quiet "synced" confirmation. */
export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status.isOnline === false) {
    return <Text style={[styles.badge, styles.offline]}>Offline</Text>;
  }
  if (status.pendingCount > 0) {
    return (
      <Text style={[styles.badge, styles.pending]}>
        {status.pendingCount} niet gesynchroniseerd
      </Text>
    );
  }
  return <Text style={[styles.badge, styles.synced]}>Gesynchroniseerd</Text>;
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: '600',
  },
  offline: {
    color: colors.danger,
  },
  pending: {
    color: colors.textSecondary,
  },
  synced: {
    color: colors.accent,
  },
});
