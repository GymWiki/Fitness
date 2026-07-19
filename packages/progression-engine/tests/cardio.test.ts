import { describe, expect, it } from 'vitest';
import { getCardioDistributionAdvice, getIntervalAdvice, getZone2Advice } from '../src/cardio';
import type { CardioLog, IntervalProgressionConfig, Zone2ProgressionConfig } from '../src/types';

function log(overrides: Partial<CardioLog> & Pick<CardioLog, 'type' | 'durationMinutes'>): CardioLog {
  return { date: '2026-07-01', rpe: 4, ...overrides };
}

describe('getCardioDistributionAdvice', () => {
  it('recommends a zone 2 session when nothing has been logged yet', () => {
    const advice = getCardioDistributionAdvice([]);
    expect(advice.recommendedType).toBe('zone2');
    expect(advice.zone2Ratio).toBe(0);
  });

  it('recommends zone 2 when the recent split is too intense (below 80%)', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 60 }),
      log({ type: 'interval', durationMinutes: 40 }),
    ];
    const advice = getCardioDistributionAdvice(logs);
    expect(advice.zone2Ratio).toBeCloseTo(0.6);
    expect(advice.recommendedType).toBe('zone2');
  });

  it('recommends an interval session once zone 2 share is at or above the target', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 90 }),
      log({ type: 'interval', durationMinutes: 20 }),
    ];
    const advice = getCardioDistributionAdvice(logs);
    expect(advice.zone2Ratio).toBeCloseTo(0.818, 2);
    expect(advice.recommendedType).toBe('interval');
  });

  it('supports a custom target ratio', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 70 }),
      log({ type: 'interval', durationMinutes: 30 }),
    ];
    const advice = getCardioDistributionAdvice(logs, 0.6);
    expect(advice.recommendedType).toBe('interval');
  });
});

describe('getZone2Advice', () => {
  const cycle: Zone2ProgressionConfig = { weekInCycle: 2, cycleLengthWeeks: 4 };
  const baseline = { rpe: 4, avgHeartRate: 140 };

  it('increases duration by 7.5% when RPE and heart rate are normal', () => {
    const last = log({ type: 'zone2', durationMinutes: 40, rpe: 4, avgHeartRate: 138 });
    const advice = getZone2Advice(40, cycle, last, baseline);
    expect(advice.action).toBe('increase_duration');
    expect(advice.durationMinutes).toBe(43); // round(40 * 1.075)
  });

  it('maintains duration when RPE is higher than normal at the same pace', () => {
    const last = log({ type: 'zone2', durationMinutes: 40, rpe: 6, avgHeartRate: 138 });
    const advice = getZone2Advice(40, cycle, last, baseline);
    expect(advice.action).toBe('maintain');
    expect(advice.durationMinutes).toBe(40);
    expect(advice.explanation).toContain('RPE');
  });

  it('maintains duration when heart rate is higher than normal at the same pace', () => {
    const last = log({ type: 'zone2', durationMinutes: 40, rpe: 4, avgHeartRate: 155 });
    const advice = getZone2Advice(40, cycle, last, baseline);
    expect(advice.action).toBe('maintain');
    expect(advice.explanation).toContain('hartslag');
  });

  it('deloads on the last week of the cycle regardless of performance', () => {
    const deloadCycle: Zone2ProgressionConfig = { weekInCycle: 4, cycleLengthWeeks: 4 };
    const last = log({ type: 'zone2', durationMinutes: 55, rpe: 3, avgHeartRate: 130 });
    const advice = getZone2Advice(55, deloadCycle, last, baseline);
    expect(advice.action).toBe('deload');
    expect(advice.durationMinutes).toBe(44); // round(55 * 0.8)
    expect(advice.durationChangePercent).toBe(-20);
  });

  it('does not require heart rate data to make a decision', () => {
    const last = log({ type: 'zone2', durationMinutes: 40, rpe: 3 });
    const advice = getZone2Advice(40, cycle, last, { rpe: 4 });
    expect(advice.action).toBe('increase_duration');
  });
});

describe('getIntervalAdvice', () => {
  const config: IntervalProgressionConfig = { maxRoundsBeforeTempoIncrease: 6 };

  it('increases rounds first when under the round ceiling and RPE is normal', () => {
    const last = log({ type: 'interval', durationMinutes: 24, rpe: 7, rounds: 4 });
    const advice = getIntervalAdvice(4, 1, config, last, 7);
    expect(advice.action).toBe('increase_rounds');
    expect(advice.rounds).toBe(5);
    expect(advice.tempoLevel).toBe(1);
  });

  it('increases tempo instead of rounds once the round ceiling is reached', () => {
    const last = log({ type: 'interval', durationMinutes: 36, rpe: 7, rounds: 6 });
    const advice = getIntervalAdvice(6, 1, config, last, 7);
    expect(advice.action).toBe('increase_tempo');
    expect(advice.tempoLevel).toBe(2);
    expect(advice.rounds).toBe(6);
  });

  it('never increases rounds and tempo in the same step', () => {
    const last = log({ type: 'interval', durationMinutes: 36, rpe: 7, rounds: 6 });
    const advice = getIntervalAdvice(6, 1, config, last, 7);
    const changedRounds = advice.rounds !== 6;
    const changedTempo = advice.tempoLevel !== 1;
    expect(changedRounds && changedTempo).toBe(false);
  });

  it('maintains rounds and tempo when RPE is higher than normal', () => {
    const last = log({ type: 'interval', durationMinutes: 24, rpe: 9, rounds: 4 });
    const advice = getIntervalAdvice(4, 1, config, last, 7);
    expect(advice.action).toBe('maintain');
    expect(advice.rounds).toBe(4);
    expect(advice.tempoLevel).toBe(1);
  });
});
