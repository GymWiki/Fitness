import { useEffect, useState, useSyncExternalStore } from 'react';
import { getPendingCount, subscribeToQueue } from './offlineQueue';

export interface SyncStatus {
  /** null before the browser's online status has been read (SSR/first paint). */
  isOnline: boolean | null;
  pendingCount: number;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return null;
}

/**
 * Live sync status for the subtle "offline / N wachten / gesynchroniseerd"
 * indicator. Ported from the Expo app's `useNetInfo`-based hook — the web
 * analog is `navigator.onLine` plus the `online`/`offline` window events,
 * read via `useSyncExternalStore`.
 */
export function useSyncStatus(): SyncStatus {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
    return subscribeToQueue(setPendingCount);
  }, []);

  return { isOnline, pendingCount };
}
