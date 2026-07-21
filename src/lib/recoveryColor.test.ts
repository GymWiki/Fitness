import type { RecoveryEstimate } from '@fitness/progression-engine';
import { describe, expect, it } from 'vitest';
import { colors } from '@/theme/colors';
import { recoveryColor } from './recoveryColor';

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

describe('recoveryColor', () => {
  it('is pure accent green for no_data (ready to start)', () => {
    expect(recoveryColor(estimate({ status: 'no_data', hoursSinceSession: null }))).toBe(colors.accent);
  });

  it('is pure danger red right when a session just happened (recovering, 0 hours in)', () => {
    expect(recoveryColor(estimate({ status: 'recovering', hoursSinceSession: 0, windowStartHours: 48 }))).toBe(colors.danger);
  });

  it('interpolates toward warning as the recovering muscle group approaches the window, never repeating the same shade', () => {
    const justStarted = recoveryColor(estimate({ status: 'recovering', hoursSinceSession: 0, windowStartHours: 48 }));
    const early = recoveryColor(estimate({ status: 'recovering', hoursSinceSession: 5, windowStartHours: 48 }));
    const late = recoveryColor(estimate({ status: 'recovering', hoursSinceSession: 45, windowStartHours: 48 }));
    expect(new Set([justStarted, early, late]).size).toBe(3);
    expect(late).not.toBe(colors.danger);
  });

  it('never exceeds the warning color even if hoursSinceSession is inconsistently past windowStartHours for a recovering status', () => {
    expect(recoveryColor(estimate({ status: 'recovering', hoursSinceSession: 999, windowStartHours: 48 }))).toBe(colors.warning);
  });

  it('is pure accent green when ready (the peak of the curve)', () => {
    expect(recoveryColor(estimate({ status: 'ready', hoursSinceSession: 50, windowStartHours: 48, windowEndHours: 96 }))).toBe(colors.accent);
  });

  it('is pure accent green right as the window starts closing', () => {
    expect(
      recoveryColor(estimate({ status: 'window_closing', hoursSinceSession: 72, windowStartHours: 72, windowEndHours: 96 })),
    ).toBe(colors.accent);
  });

  it('interpolates from green toward warning as the window keeps closing', () => {
    const midClosing = recoveryColor(estimate({ status: 'window_closing', hoursSinceSession: 84, windowStartHours: 72, windowEndHours: 96 }));
    const almostClosed = recoveryColor(estimate({ status: 'window_closing', hoursSinceSession: 95, windowStartHours: 72, windowEndHours: 96 }));
    expect(midClosing).not.toBe(colors.accent);
    expect(almostClosed).not.toBe(midClosing);
  });

  it('is pure warning right at the window close edge', () => {
    expect(
      recoveryColor(estimate({ status: 'window_closing', hoursSinceSession: 96, windowStartHours: 72, windowEndHours: 96 })),
    ).toBe(colors.warning);
  });

  it('is pure grey once the window has passed', () => {
    expect(recoveryColor(estimate({ status: 'window_passed', hoursSinceSession: 200, windowStartHours: 48, windowEndHours: 96 }))).toBe(
      colors.textTertiary,
    );
  });

  it('produces a valid 6-digit hex color for every status', () => {
    const statuses: RecoveryEstimate['status'][] = ['recovering', 'ready', 'window_closing', 'window_passed', 'no_data'];
    for (const status of statuses) {
      const color = recoveryColor(estimate({ status, hoursSinceSession: status === 'no_data' ? null : 60 }));
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
