import { describe, expect, it } from 'vitest';
import { estimateRecoveryState, type RecoveryEstimate, type RecoverySessionInput, type RecoveryStatus } from '../src/recovery';
import { generateRecoveryCurve } from '../src/recoveryCurve';

const REFERENCE = new Date('2026-07-20T12:00:00Z');

function hoursAgo(hours: number): string {
  return new Date(REFERENCE.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function session(overrides: Partial<RecoverySessionInput> = {}): RecoverySessionInput {
  return {
    performedAt: hoursAgo(60),
    setsCompleted: 8,
    averageRIR: 2,
    hasCompoundLift: true,
    ...overrides,
  };
}

function estimate(overrides: Partial<RecoveryEstimate>): RecoveryEstimate {
  return {
    status: 'recovering',
    hoursSinceSession: 0,
    windowStartHours: 40,
    windowEndHours: 72,
    explanation: 'test',
    ...overrides,
  };
}

describe('generateRecoveryCurve', () => {
  it('shows a clear dip with "now" near the trough for a muscle group just trained', () => {
    const source = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(2) }), {}, REFERENCE);
    expect(source.status).toBe('recovering');

    const curve = generateRecoveryCurve('Borst', source);
    expect(curve.now.status).toBe('recovering');
    expect(curve.now.level).toBeLessThan(curve.baseline - 10);
  });

  it('shows "now" at or near the peak for a muscle group inside its ready window', () => {
    // Medium baseline window ~[40, 72]h at a neutral session -> the illustrative
    // peak sits at windowStartHours + (windowEndHours - windowStartHours) * 0.4 ≈ 53h,
    // which is still comfortably inside the 'ready' phase (< windowClosingStartHours ≈ 64h).
    const source = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(53), averageRIR: 2, setsCompleted: 8 }), {}, REFERENCE);
    expect(source.status).toBe('ready');

    const curve = generateRecoveryCurve('Borst', source);
    expect(curve.now.status).toBe('ready');
    expect(curve.now.level).toBeGreaterThan(curve.baseline + 10);
  });

  it('never contradicts the source estimate\'s status, for every possible status', () => {
    const statuses: RecoveryStatus[] = ['recovering', 'ready', 'window_closing', 'window_passed', 'no_data'];
    for (const status of statuses) {
      const source = estimate({ status, hoursSinceSession: status === 'no_data' ? null : 50 });
      const curve = generateRecoveryCurve('Rug', source);
      expect(curve.now.status).toBe(status);
      expect(curve.windowStartHours).toBe(source.windowStartHours);
      expect(curve.windowEndHours).toBe(source.windowEndHours);
    }
  });

  it('places "now" exactly at the estimate\'s own hoursSinceSession, never a recomputed value', () => {
    const source = estimate({ status: 'window_closing', hoursSinceSession: 65, windowStartHours: 40, windowEndHours: 72 });
    const curve = generateRecoveryCurve('Schouders', source);
    expect(curve.now.hoursFromSession).toBe(65);
  });

  it('renders a flat baseline curve for no_data — nothing to illustrate yet', () => {
    const source = estimate({ status: 'no_data', hoursSinceSession: null, windowStartHours: 40, windowEndHours: 72 });
    const curve = generateRecoveryCurve('Buik', source);
    expect(curve.now.level).toBe(curve.baseline);
    expect(curve.points.every((point) => point.level === curve.baseline)).toBe(true);
  });

  it('always keeps "now" within the sampled point domain, even long after window_passed', () => {
    const source = estimate({ status: 'window_passed', hoursSinceSession: 500, windowStartHours: 40, windowEndHours: 72 });
    const curve = generateRecoveryCurve('Kuiten', source);
    const maxSampledHours = Math.max(...curve.points.map((point) => point.hoursFromSession));
    expect(curve.now.hoursFromSession).toBeLessThanOrEqual(maxSampledHours);
  });

  it('is deterministic: same estimate in, same curve out', () => {
    const source = estimate({ status: 'ready', hoursSinceSession: 50 });
    const a = generateRecoveryCurve('Triceps', source);
    const b = generateRecoveryCurve('Triceps', source);
    expect(a).toEqual(b);
  });
});
