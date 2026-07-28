const CACHE_PREFIX = 'read_cache_v1:';

/** Exported for `useCachedData` (stale-while-revalidate hook): lets a component peek at a value before deciding whether to fetch. */
export async function readCache<T>(key: string): Promise<T | null> {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(CACHE_PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Exported for `useCachedData` — see `readCache`. */
export async function writeCache<T>(key: string, value: T): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
}

/**
 * Network-first read with a local fallback: tries `fetcher`, caches the
 * result on success (so it's always the freshest data available), and on
 * failure (offline, timeout, ...) falls back to whatever was cached last.
 * Only throws when there's truly nothing to show — no network and no prior
 * cache for this key (e.g. the very first time this screen is opened).
 *
 * This is deliberately one-directional: cache is only ever written from a
 * successful network read, never from local input, so it can't go stale in
 * a way that overwrites something the user just did — writes go through the
 * separate offline queue (`offlineQueue.ts`), not this cache.
 *
 * Ported from the Expo app's AsyncStorage-backed version — same key shape
 * and semantics, `localStorage` in place of AsyncStorage (the web analog).
 */
export async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    await writeCache(key, data);
    return data;
  } catch (error) {
    const cached = await readCache<T>(key);
    if (cached !== null) return cached;
    throw error;
  }
}
