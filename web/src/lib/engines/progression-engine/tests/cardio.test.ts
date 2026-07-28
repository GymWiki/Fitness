import { describe, expect, it } from 'vitest';
import { adviseCardioProgression, adviseNextCardioType, computeWeeklyDistribution } from '../src/cardio';
import type { CardioLog, Goal } from '../src/types';

function log(overrides: Partial<CardioLog> & Pick<CardioLog, 'type' | 'durationMinutes' | 'date'>): CardioLog {
  return { rpe: 4, ...overrides };
}

const REFERENCE_DATE = new Date('2026-07-15T12:00:00Z');

describe('computeWeeklyDistribution', () => {
  it('returns all zeros when there are no logs', () => {
    const distribution = computeWeeklyDistribution([], 10, REFERENCE_DATE);
    expect(distribution.totalMinutes).toBe(0);
    expect(distribution.intensePercent).toBe(0);
  });

  it('splits minutes into low (zone2) and high (interval)', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 60, date: '2026-07-10' }),
      log({ type: 'interval', durationMinutes: 20, date: '2026-07-12' }),
    ];
    const distribution = computeWeeklyDistribution(logs, 10, REFERENCE_DATE);
    expect(distribution.lowMinutes).toBe(60);
    expect(distribution.highMinutes).toBe(20);
    expect(distribution.totalMinutes).toBe(80);
    expect(distribution.intensePercent).toBeCloseTo(25, 0);
  });

  it('excludes logs outside the trailing window', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 60, date: '2026-06-01' }), // more than 10 days before reference
      log({ type: 'interval', durationMinutes: 20, date: '2026-07-14' }),
    ];
    const distribution = computeWeeklyDistribution(logs, 10, REFERENCE_DATE);
    expect(distribution.lowMinutes).toBe(0);
    expect(distribution.highMinutes).toBe(20);
  });
});

describe('adviseNextCardioType', () => {
  it('recommends zone 2 when nothing has been logged yet', () => {
    const distribution = computeWeeklyDistribution([], 10, REFERENCE_DATE);
    const advice = adviseNextCardioType(distribution, 'mixed');
    expect(advice.recommendedType).toBe('zone2');
  });

  it('recommends zone 2 after a lot of intensive sessions', () => {
    const logs = [
      log({ type: 'interval', durationMinutes: 40, date: '2026-07-10' }),
      log({ type: 'interval', durationMinutes: 40, date: '2026-07-12' }),
      log({ type: 'interval', durationMinutes: 40, date: '2026-07-14' }),
    ];
    const distribution = computeWeeklyDistribution(logs, 10, REFERENCE_DATE);
    const advice = adviseNextCardioType(distribution, 'mixed');
    expect(advice.recommendedType).toBe('zone2');
  });

  it('recommends an interval session after only zone 2 work', () => {
    const logs = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-10' }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-12' }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-14' }),
    ];
    const distribution = computeWeeklyDistribution(logs, 10, REFERENCE_DATE);
    const advice = adviseNextCardioType(distribution, 'mixed');
    expect(advice.recommendedType).toBe('interval');
  });

  it('uses a goal-dependent target (strength trainees need a higher zone2 share to be "on target")', () => {
    // 80% zone2 -> right at the default/mixed target, but below the more conservative strength target.
    const logs = [
      log({ type: 'zone2', durationMinutes: 80, date: '2026-07-10' }),
      log({ type: 'interval', durationMinutes: 20, date: '2026-07-12' }),
    ];
    const distribution = computeWeeklyDistribution(logs, 10, REFERENCE_DATE);
    expect(adviseNextCardioType(distribution, 'mixed').recommendedType).toBe('interval');
    expect(adviseNextCardioType(distribution, 'strength').recommendedType).toBe('zone2');
  });
});

describe('adviseCardioProgression - zone2', () => {
  it('starts at a fixed baseline when there is no history', () => {
    const advice = adviseCardioProgression([], 'zone2', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.durationMinutes).toBeGreaterThan(0);
  });

  it('does not increase duration after the first session (nothing to compare against yet)', () => {
    const sessions = [log({ type: 'zone2', durationMinutes: 30, date: '2026-07-14', rpe: 4 })];
    const advice = adviseCardioProgression(sessions, 'zone2', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.durationMinutes).toBe(30);
  });

  it('increases duration when RPE and heart rate are normal, by at most 10%', () => {
    const sessions = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-08', rpe: 4, avgHeartRate: 140 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-11', rpe: 4, avgHeartRate: 138 }),
    ];
    const advice = adviseCardioProgression(sessions, 'zone2', 'endurance');
    expect(advice.action).toBe('increase_duration');
    expect(advice.durationChangePercent).toBeLessThanOrEqual(10);
    expect(advice.durationMinutes).toBe(44); // round(40 * 1.10) for the endurance goal's 10% step
  });

  it('does not increase duration when RPE is higher than the recent average at the same pace', () => {
    const sessions = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-08', rpe: 4 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-11', rpe: 4 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-14', rpe: 7 }),
    ];
    const advice = adviseCardioProgression(sessions, 'zone2', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.durationMinutes).toBe(40);
    expect(advice.explanation).toContain('RPE');
  });

  it('does not increase duration when heart rate is higher than normal at the same pace', () => {
    const sessions = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-08', rpe: 4, avgHeartRate: 138 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-11', rpe: 4, avgHeartRate: 140 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-14', rpe: 4, avgHeartRate: 155 }),
    ];
    const advice = adviseCardioProgression(sessions, 'zone2', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.explanation).toContain('hartslag');
  });

  it('deloads on the 4th session of every build cycle (3 up, 1 back), regardless of performance', () => {
    const sessions = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-06-20', rpe: 3 }),
      log({ type: 'zone2', durationMinutes: 43, date: '2026-06-24', rpe: 3 }),
      log({ type: 'zone2', durationMinutes: 46, date: '2026-06-28', rpe: 3 }),
      log({ type: 'zone2', durationMinutes: 50, date: '2026-07-02', rpe: 3 }), // 4th session
    ];
    const advice = adviseCardioProgression(sessions, 'zone2', 'mixed');
    expect(advice.action).toBe('deload');
    expect(advice.durationChangePercent).toBe(-20);
    expect(advice.durationMinutes).toBe(40); // round(50 * 0.8)
  });

  it('never applies more than a 10% step for any goal', () => {
    const sessions = [
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-08', rpe: 4 }),
      log({ type: 'zone2', durationMinutes: 40, date: '2026-07-11', rpe: 4 }),
    ];
    const goals: Goal[] = ['hypertrophy', 'strength', 'endurance', 'fat_loss', 'mixed'];
    for (const goal of goals) {
      const advice = adviseCardioProgression(sessions, 'zone2', goal);
      expect(advice.durationChangePercent).toBeLessThanOrEqual(10);
    }
  });
});

describe('adviseCardioProgression - interval', () => {
  it('starts at a fixed baseline when there is no history', () => {
    const advice = adviseCardioProgression([], 'interval', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.rounds).toBeGreaterThan(0);
    expect(advice.tempoLevel).toBe(1);
  });

  it('increases rounds first when under the round ceiling and RPE is normal', () => {
    const sessions = [
      log({ type: 'interval', durationMinutes: 28, date: '2026-07-08', rpe: 7, rounds: 4 }),
      log({ type: 'interval', durationMinutes: 28, date: '2026-07-11', rpe: 7, rounds: 4 }),
    ];
    const advice = adviseCardioProgression(sessions, 'interval', 'mixed');
    expect(advice.action).toBe('increase_rounds');
    expect(advice.rounds).toBe(5);
    expect(advice.tempoLevel).toBe(1);
  });

  it('increases tempo (not rounds) once the goal-dependent round ceiling is reached', () => {
    // 'strength' has a low round ceiling (5), so hitting 5 rounds should trigger a tempo bump next.
    const sessions = [
      log({ type: 'interval', durationMinutes: 35, date: '2026-07-08', rpe: 7, rounds: 5 }),
      log({ type: 'interval', durationMinutes: 35, date: '2026-07-11', rpe: 7, rounds: 5 }),
    ];
    const advice = adviseCardioProgression(sessions, 'interval', 'strength');
    expect(advice.action).toBe('increase_tempo');
    expect(advice.tempoLevel).toBe(2);
  });

  it('never increases rounds and tempo in the same step (a tempo bump resets rounds down, not up)', () => {
    const sessions = [
      log({ type: 'interval', durationMinutes: 35, date: '2026-07-08', rpe: 7, rounds: 5 }),
      log({ type: 'interval', durationMinutes: 35, date: '2026-07-11', rpe: 7, rounds: 5 }),
    ];
    const advice = adviseCardioProgression(sessions, 'interval', 'strength');
    const roundsIncreased = advice.rounds > 5;
    const tempoIncreased = advice.tempoLevel > 1;
    expect(roundsIncreased && tempoIncreased).toBe(false);
  });

  it('maintains rounds and tempo when RPE is higher than normal', () => {
    const sessions = [
      log({ type: 'interval', durationMinutes: 28, date: '2026-07-08', rpe: 7, rounds: 4 }),
      log({ type: 'interval', durationMinutes: 28, date: '2026-07-11', rpe: 7, rounds: 4 }),
      log({ type: 'interval', durationMinutes: 28, date: '2026-07-14', rpe: 9, rounds: 4 }),
    ];
    const advice = adviseCardioProgression(sessions, 'interval', 'mixed');
    expect(advice.action).toBe('maintain');
    expect(advice.rounds).toBe(4);
    expect(advice.tempoLevel).toBe(1);
  });
});
