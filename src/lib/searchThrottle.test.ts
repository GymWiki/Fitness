import { describe, expect, it } from 'vitest';
import { canSearchNow, DEFAULT_MIN_SEARCH_INTERVAL_MS } from './searchThrottle';

describe('canSearchNow', () => {
  it('allows the first search (no previous timestamp)', () => {
    expect(canSearchNow(null, 1_000)).toBe(true);
  });

  it('blocks a second search fired immediately after the first (e.g. a double-tap)', () => {
    expect(canSearchNow(1_000, 1_010)).toBe(false);
  });

  it('blocks a search fired just under the minimum interval', () => {
    expect(canSearchNow(1_000, 1_000 + DEFAULT_MIN_SEARCH_INTERVAL_MS - 1)).toBe(false);
  });

  it('allows a search once the minimum interval has elapsed', () => {
    expect(canSearchNow(1_000, 1_000 + DEFAULT_MIN_SEARCH_INTERVAL_MS)).toBe(true);
  });

  it('respects a custom minInterval', () => {
    expect(canSearchNow(1_000, 1_500, 1_000)).toBe(false);
    expect(canSearchNow(1_000, 2_000, 1_000)).toBe(true);
  });

  it('never fires per keystroke in practice: many rapid calls within the window all collapse to a single allowed search', () => {
    let lastSearchAt: number | null = null;
    let allowedCount = 0;
    for (let now = 0; now < 5_000; now += 50) {
      // simulates a user typing fast (a call attempted every 50ms)
      if (canSearchNow(lastSearchAt, now)) {
        allowedCount++;
        lastSearchAt = now;
      }
    }
    // 5000ms window / 500ms minimum interval = at most 10 allowed searches, not 100 (one per 50ms tick).
    expect(allowedCount).toBeLessThanOrEqual(10);
  });
});
