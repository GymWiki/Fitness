import { describe, expect, it } from 'vitest';
import { shouldDeload } from '../src/deload';
import type { RecentWeekSummary } from '../src/types';

function week(weekNumber: number, overrides: Partial<RecentWeekSummary> = {}): RecentWeekSummary {
  return { weekNumber, wasDeload: false, hasRecoverySignal: false, ...overrides };
}

describe('shouldDeload', () => {
  it('does not deload with no history', () => {
    const decision = shouldDeload([]);
    expect(decision.shouldDeload).toBe(false);
  });

  it('proposes a deload after 5 weeks without one', () => {
    const weeks = [week(1), week(2), week(3), week(4), week(5)];
    const decision = shouldDeload(weeks);
    expect(decision.shouldDeload).toBe(true);
    expect(decision.reason).toContain('5 weken');
  });

  it('does not deload before the cycle is due, with no recovery signals', () => {
    const weeks = [week(1), week(2), week(3)];
    const decision = shouldDeload(weeks);
    expect(decision.shouldDeload).toBe(false);
  });

  it('resets the count after a deload week', () => {
    const weeks = [week(1), week(2), week(3), week(4), week(5, { wasDeload: true }), week(6)];
    const decision = shouldDeload(weeks);
    expect(decision.shouldDeload).toBe(false);
  });

  it('deloads early after two consecutive weeks of recovery signals', () => {
    const weeks = [week(1), week(2, { hasRecoverySignal: true }), week(3, { hasRecoverySignal: true })];
    const decision = shouldDeload(weeks);
    expect(decision.shouldDeload).toBe(true);
    expect(decision.reason).toContain('herstelsignalen');
  });

  it('does not deload early after only a single week of recovery signals', () => {
    const weeks = [week(1), week(2), week(3, { hasRecoverySignal: true })];
    const decision = shouldDeload(weeks);
    expect(decision.shouldDeload).toBe(false);
  });

  it('respects a custom cycle length', () => {
    const weeks = [week(1), week(2), week(3)];
    expect(shouldDeload(weeks, 3).shouldDeload).toBe(true);
    expect(shouldDeload(weeks, 4).shouldDeload).toBe(false);
  });
});
