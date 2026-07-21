export const DEFAULT_MIN_SEARCH_INTERVAL_MS = 500;

/**
 * Pure guard for the Open Food Facts search screen: search only fires on an
 * explicit action (submit/button), never per keystroke — this additionally
 * blocks a second explicit trigger fired within `minIntervalMs` of the last
 * one (e.g. a double-tap), keeping well under OFF's 10 req/min search limit.
 */
export function canSearchNow(lastSearchAtMs: number | null, nowMs: number, minIntervalMs: number = DEFAULT_MIN_SEARCH_INTERVAL_MS): boolean {
  if (lastSearchAtMs === null) return true;
  return nowMs - lastSearchAtMs >= minIntervalMs;
}
