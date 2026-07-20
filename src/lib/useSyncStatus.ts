import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { getPendingCount, subscribeToQueue } from './offlineQueue';

export interface SyncStatus {
  /** null while NetInfo hasn't reported yet. */
  isOnline: boolean | null;
  pendingCount: number;
}

/** Live sync status for the subtle "offline / N wachten / gesynchroniseerd" indicator. */
export function useSyncStatus(): SyncStatus {
  const netInfo = useNetInfo();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
    return subscribeToQueue(setPendingCount);
  }, []);

  return { isOnline: netInfo.isConnected, pendingCount };
}
