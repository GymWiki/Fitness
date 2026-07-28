import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { readCache, writeCache } from './offlineCache';

/**
 * Stale-while-revalidate data for a screen/card that reloads on every
 * focus. The dashboard cards used to re-show a spinner on every single
 * re-focus (tabbing away and back), even though they'd already fetched the
 * same data moments earlier — this is what made the app feel slow to open.
 *
 * Fix: the very first time this `key` has ever resolved (this session or a
 * previous one, via `readCache`), paint that immediately with no spinner,
 * then refresh in the background and swap in the fresh result silently. A
 * spinner only appears when there's truly nothing — cached or in memory —
 * to show yet. A background refetch failure never blanks out data that's
 * already on screen; it just leaves it as-is (the existing sync-status
 * badge is what surfaces connectivity issues, not this card).
 *
 * `fetcher` is read through a ref, not a dependency, so callers can pass a
 * fresh inline closure every render without retriggering the effect —
 * only a change to `key` does that.
 */
export function useCachedData<T>(key: string, fetcher: () => Promise<T>): { data: T | null; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    if (dataRef.current === null) {
      try {
        const cached = await readCache<T>(key);
        if (cached !== null) {
          dataRef.current = cached;
          setData(cached);
          setIsLoading(false);
        }
      } catch {
        // Cache read failed — fall through to a normal network load below.
      }
    }
    try {
      const fresh = await fetcherRef.current();
      dataRef.current = fresh;
      setData(fresh);
      setError(null);
      void writeCache(key, fresh);
    } catch (err) {
      if (dataRef.current === null) {
        setError(err instanceof Error ? err.message : 'Laden mislukt.');
      }
    } finally {
      setIsLoading(false);
    }
    // `key` is the only thing that should ever retrigger a load — see the fetcherRef comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { data, isLoading, error };
}
