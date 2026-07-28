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
  it('starts exactly on baseline right at the session (hour 0)', () => {
    const curve = generateRecoveryCurve('Borst', estimate({ status: 'recovering', hoursSinceSession: 0, windowStartHours: 40, windowEndHours: 72 }));
    const firstPoint = curve.points[0]!;
    expect(firstPoint.hoursFromSession).toBe(0);
    expect(firstPoint.level).toBe(curve.baseline);
  });

  it('dips below baseline, bottoms out, and returns to baseline by windowStartHours (phase 1+2)', () => {
    const curve = generateRecoveryCurve('Borst', estimate({ status: 'recovering', windowStartHours: 40, windowEndHours: 72 }));
    const phase12Points = curve.points.filter((point) => point.hoursFromSession <= curve.windowStartHours);
    const minLevel = Math.min(...phase12Points.map((point) => point.level));
    expect(minLevel).toBeLessThan(curve.baseline);
    // Back on baseline exactly at windowStartHours (the recrossing point).
    const crossingPoint = curve.points.find((point) => point.hoursFromSession === curve.windowStartHours)!;
    expect(crossingPoint.level).toBe(curve.baseline);
  });

  it('rises above baseline through a peak, then decays back to baseline by decayEndHours (phase 3+4)', () => {
    const curve = generateRecoveryCurve('Borst', estimate({ status: 'ready', windowStartHours: 40, windowEndHours: 72 }));
    const peakPoint = curve.points.find((point) => point.hoursFromSession === curve.peakHours)!;
    expect(peakPoint.level).toBeGreaterThan(curve.baseline);
    const decayEndPoint = curve.points.find((point) => point.hoursFromSession === curve.decayEndHours)!;
    expect(decayEndPoint.level).toBe(curve.baseline);
  });

  it('makes dip depth and peak height approximately equal', () => {
    const curve = generateRecoveryCurve('Borst', estimate({ status: 'ready', windowStartHours: 40, windowEndHours: 72 }));
    const phase12Points = curve.points.filter((point) => point.hoursFromSession <= curve.windowStartHours);
    const dipDepth = curve.baseline - Math.min(...phase12Points.map((point) => point.level));
    const peakHeight = Math.max(...curve.points.map((point) => point.level)) - curve.baseline;
    expect(Math.abs(dipDepth - peakHeight)).toBeLessThan(0.01);
  });

  it('gives phase 3+4 (supercompensation + decay) roughly the same duration as phase 1+2 (training + recovery)', () => {
    const curve = generateRecoveryCurve('Borst', estimate({ status: 'ready', windowStartHours: 40, windowEndHours: 72 }));
    const phase12Duration = curve.windowStartHours;
    const phase34Duration = curve.decayEndHours - curve.windowStartHours;
    expect(phase34Duration).toBe(phase12Duration);
  });

  it('shows "now" near the trough for a muscle group just trained', () => {
    // Medium baseline window ~[40, 72]h at a neutral session -> the illustrative
    // trough sits at windowStartHours * 0.5 = 20h, still well inside 'recovering'.
    const source = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(20), averageRIR: 2, setsCompleted: 8 }), {}, REFERENCE);
    expect(source.status).toBe('recovering');

    const curve = generateRecoveryCurve('Borst', source);
    expect(curve.now.status).toBe('recovering');
    expect(curve.now.level).toBeLessThan(curve.baseline - 10);
  });

  it('shows "now" at or near the peak for a muscle group inside its ready window', () => {
    // Medium baseline window ~[40, 72]h at a neutral session -> the illustrative
    // peak sits at windowStartHours * 1.5 = 60h, still inside 'ready' (< windowClosingStartHours ≈ 64h).
    const source = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(60), averageRIR: 2, setsCompleted: 8 }), {}, REFERENCE);
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
