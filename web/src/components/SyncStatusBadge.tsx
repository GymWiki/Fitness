import type { SyncStatus } from '@/lib/useSyncStatus';

/** Subtle sync indicator: offline takes priority, then a pending count, then a quiet "synced" confirmation. */
export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status.isOnline === false) {
    return <span className="text-xs font-semibold text-danger">Offline</span>;
  }
  if (status.pendingCount > 0) {
    return <span className="text-xs font-semibold text-text-secondary">{status.pendingCount} niet gesynchroniseerd</span>;
  }
  return <span className="text-xs font-semibold text-accent">Gesynchroniseerd</span>;
}
