import { describe, expect, it } from 'vitest';
import { estimateRecoveryState, muscleGroupSize, type RecoverySessionInput } from '../src/recovery';

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

describe('muscleGroupSize', () => {
  it('classifies large, medium and small muscle groups as documented', () => {
    expect(muscleGroupSize('Benen')).toBe('large');
    expect(muscleGroupSize('Borst')).toBe('medium');
    expect(muscleGroupSize('Biceps')).toBe('small');
  });

  it('falls back to medium for an unknown muscle group', () => {
    expect(muscleGroupSize('Onbekend')).toBe('medium');
  });
});

describe('estimateRecoveryState', () => {
  it('returns no_data with an immediately-open window when there is no prior session', () => {
    const estimate = estimateRecoveryState('Borst', null, {}, REFERENCE);
    expect(estimate.status).toBe('no_data');
    expect(estimate.hoursSinceSession).toBeNull();
    expect(estimate.explanation).toContain('Borst');
  });

  it('is "recovering" shortly after a session', () => {
    const estimate = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(2) }), {}, REFERENCE);
    expect(estimate.status).toBe('recovering');
  });

  it('is "ready" once inside the estimated window', () => {
    // Medium baseline window ~[40, 72]h at a neutral (average) session heaviness.
    const estimate = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(45), averageRIR: 2, setsCompleted: 8 }), {}, REFERENCE);
    expect(estimate.status).toBe('ready');
  });

  it('is "window_closing" near the end of the window', () => {
    const estimate = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(70), averageRIR: 2, setsCompleted: 8 }), {}, REFERENCE);
    expect(estimate.status).toBe('window_closing');
  });

  it('is "window_passed" long after the session', () => {
    const estimate = estimateRecoveryState('Borst', session({ performedAt: hoursAgo(200) }), {}, REFERENCE);
    expect(estimate.status).toBe('window_passed');
  });

  it('a heavier session (low RIR, high volume, compound) extends the window versus a lighter one', () => {
    const light = estimateRecoveryState(
      'Borst',
      session({ performedAt: hoursAgo(50), averageRIR: 4, setsCompleted: 3, hasCompoundLift: false }),
      {},
      REFERENCE,
    );
    const heavy = estimateRecoveryState(
      'Borst',
      session({ performedAt: hoursAgo(50), averageRIR: 0, setsCompleted: 15, hasCompoundLift: true }),
      {},
      REFERENCE,
    );
    expect(heavy.windowEndHours).toBeGreaterThan(light.windowEndHours);
    // Same elapsed time, but the heavier session's window hasn't opened yet while the light one is already ready/past.
    expect(heavy.status).not.toBe(light.status);
  });

  it('high reported soreness and poor sleep extend the window further', () => {
    const base = estimateRecoveryState('Rug', session({ performedAt: hoursAgo(50) }), {}, REFERENCE);
    const tired = estimateRecoveryState('Rug', session({ performedAt: hoursAgo(50) }), { soreness: 5, sleepQuality: 1 }, REFERENCE);
    expect(tired.windowEndHours).toBeGreaterThan(base.windowEndHours);
  });

  it('a large muscle group gets a longer baseline window than a small one for an identical session', () => {
    const large = estimateRecoveryState('Benen', session({ performedAt: hoursAgo(30) }), {}, REFERENCE);
    const small = estimateRecoveryState('Kuiten', session({ performedAt: hoursAgo(30) }), {}, REFERENCE);
    expect(large.windowEndHours).toBeGreaterThan(small.windowEndHours);
  });

  it('every explanation is a non-empty, deterministic Dutch string (same inputs -> same output)', () => {
    const a = estimateRecoveryState('Schouders', session({ performedAt: hoursAgo(40) }), {}, REFERENCE);
    const b = estimateRecoveryState('Schouders', session({ performedAt: hoursAgo(40) }), {}, REFERENCE);
    expect(a).toEqual(b);
    expect(a.explanation.length).toBeGreaterThan(0);
  });
});
