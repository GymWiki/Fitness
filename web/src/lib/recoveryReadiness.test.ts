import type { RecoveryEstimate } from '@fitness/progression-engine';
import { describe, expect, it } from 'vitest';
import { compareMuscleRecoveryPriority, describeMuscleRecoveryTap, recoveryReadinessPercent, recoveryRingLabel } from './recoveryReadiness';

function estimate(overrides: Partial<RecoveryEstimate>): RecoveryEstimate {
  return {
    status: 'recovering',
    hoursSinceSession: 0,
    windowStartHours: 48,
    windowEndHours: 96,
    explanation: 'test',
    ...overrides,
  };
}

describe('recoveryReadinessPercent', () => {
  it('is 0% right when a session just happened', () => {
    expect(recoveryReadinessPercent(estimate({ status: 'recovering', hoursSinceSession: 0, windowStartHours: 48 }))).toBe(0);
  });

  it('fills proportionally while recovering', () => {
    expect(recoveryReadinessPercent(estimate({ status: 'recovering', hoursSinceSession: 24, windowStartHours: 48 }))).toBe(50);
  });

  it('never exceeds 100% even if hoursSinceSession is inconsistently past windowStartHours for a recovering status', () => {
    expect(recoveryReadinessPercent(estimate({ status: 'recovering', hoursSinceSession: 999, windowStartHours: 48 }))).toBe(100);
  });

  it('is 100% once ready, and stays 100% for window_closing and window_passed — recovery does not reverse', () => {
    expect(recoveryReadinessPercent(estimate({ status: 'ready', hoursSinceSession: 50, windowStartHours: 48, windowEndHours: 96 }))).toBe(100);
    expect(recoveryReadinessPercent(estimate({ status: 'window_closing', hoursSinceSession: 90, windowStartHours: 48, windowEndHours: 96 }))).toBe(100);
    expect(recoveryReadinessPercent(estimate({ status: 'window_passed', hoursSinceSession: 200, windowStartHours: 48, windowEndHours: 96 }))).toBe(100);
  });

  it('is 100% for no_data (nothing to recover from, ready to start)', () => {
    expect(recoveryReadinessPercent(estimate({ status: 'no_data', hoursSinceSession: null }))).toBe(100);
  });
});

describe('recoveryRingLabel', () => {
  it('shows a concrete hours-remaining countdown while recovering', () => {
    expect(recoveryRingLabel(estimate({ status: 'recovering', hoursSinceSession: 30, windowStartHours: 48 }))).toBe('18u te gaan');
  });

  it('never shows a negative countdown even if hoursSinceSession overshoots windowStartHours', () => {
    expect(recoveryRingLabel(estimate({ status: 'recovering', hoursSinceSession: 60, windowStartHours: 48 }))).toBe('0u te gaan');
  });

  it('falls back to the shared status label for every non-recovering status', () => {
    expect(recoveryRingLabel(estimate({ status: 'ready' }))).toBe('Hersteld');
    expect(recoveryRingLabel(estimate({ status: 'window_closing' }))).toBe('Venster sluit');
    expect(recoveryRingLabel(estimate({ status: 'window_passed' }))).toBe('Venster voorbij');
    expect(recoveryRingLabel(estimate({ status: 'no_data', hoursSinceSession: null }))).toBe('Klaar om te starten');
  });
});

describe('describeMuscleRecoveryTap', () => {
  it('reports the current status label and explanation for a recovering muscle group', () => {
    const info = describeMuscleRecoveryTap('Borst', estimate({ status: 'recovering', explanation: 'Nog aan het herstellen.' }));
    expect(info.muscleGroup).toBe('Borst');
    expect(info.statusLabel).toBe('Herstellend');
    expect(info.explanation).toBe('Nog aan het herstellen.');
  });

  it('always reflects the passed-in estimate, never a stale/cached one', () => {
    const first = describeMuscleRecoveryTap('Borst', estimate({ status: 'recovering', explanation: 'Eerste' }));
    const second = describeMuscleRecoveryTap('Borst', estimate({ status: 'ready', explanation: 'Tweede' }));
    expect(first.explanation).toBe('Eerste');
    expect(second.explanation).toBe('Tweede');
    expect(first.statusLabel).not.toBe(second.statusLabel);
  });
});

describe('compareMuscleRecoveryPriority', () => {
  function sorted(entries: Array<[string, RecoveryEstimate]>): string[] {
    return [...entries].sort(compareMuscleRecoveryPriority).map(([muscleGroup]) => muscleGroup);
  }

  it('ranks a closing window above a freshly-opened ready window', () => {
    const result = sorted([
      ['Rug', estimate({ status: 'ready' })],
      ['Borst', estimate({ status: 'window_closing' })],
    ]);
    expect(result).toEqual(['Borst', 'Rug']);
  });

  it('ranks ready above no_data, and no_data above still-recovering', () => {
    const result = sorted([
      ['Benen', estimate({ status: 'recovering', hoursSinceSession: 10, windowStartHours: 48 })],
      ['Core', estimate({ status: 'no_data', hoursSinceSession: null })],
      ['Rug', estimate({ status: 'ready' })],
    ]);
    expect(result).toEqual(['Rug', 'Core', 'Benen']);
  });

  it('puts window_passed last, even below actively recovering muscle groups', () => {
    const result = sorted([
      ['Kuiten', estimate({ status: 'window_passed' })],
      ['Biceps', estimate({ status: 'recovering', hoursSinceSession: 5, windowStartHours: 48 })],
    ]);
    expect(result).toEqual(['Biceps', 'Kuiten']);
  });

  it('within the recovering bucket, sorts the muscle group closest to its window first', () => {
    const result = sorted([
      ['Triceps', estimate({ status: 'recovering', hoursSinceSession: 5, windowStartHours: 48 })],
      ['Schouders', estimate({ status: 'recovering', hoursSinceSession: 40, windowStartHours: 48 })],
    ]);
    expect(result).toEqual(['Schouders', 'Triceps']);
  });
});
