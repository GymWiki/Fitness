import { describe, expect, it } from 'vitest';
import { getStrengthAdvice, roundToIncrement } from '../src/strength';
import type { StrengthExerciseConfig, StrengthSessionLog } from '../src/types';

const compoundConfig: StrengthExerciseConfig = {
  repRangeMin: 6,
  repRangeMax: 10,
  targetRIR: 2,
  exerciseType: 'compound',
};

const isolationConfig: StrengthExerciseConfig = {
  repRangeMin: 10,
  repRangeMax: 15,
  targetRIR: 1,
  exerciseType: 'isolation',
};

function session(date: string, sets: Array<{ weightKg: number; reps: number; rir: number }>): StrengthSessionLog {
  return { date, sets };
}

describe('roundToIncrement', () => {
  it('rounds to the nearest default 1.25kg increment', () => {
    expect(roundToIncrement(101)).toBe(101.25);
    expect(roundToIncrement(100.7)).toBe(101.25);
    expect(roundToIncrement(100.4)).toBe(100);
  });

  it('supports a custom increment', () => {
    expect(roundToIncrement(21, 2.5)).toBe(20);
    expect(roundToIncrement(22, 2.5)).toBe(22.5);
  });
});

describe('getStrengthAdvice', () => {
  it('starts on the given weight when there is no history', () => {
    const advice = getStrengthAdvice(compoundConfig, 100, []);
    expect(advice.action).toBe('maintain');
    expect(advice.weightKg).toBe(100);
    expect(advice.explanation).toContain('Nog geen sessies');
  });

  it('increases weight by 5% for a compound lift when all sets hit the top of the range at target RIR', () => {
    const history = [
      session('2026-07-01', [
        { weightKg: 100, reps: 10, rir: 2 },
        { weightKg: 100, reps: 10, rir: 2 },
        { weightKg: 100, reps: 10, rir: 3 },
      ]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('increase_weight');
    expect(advice.weightChangePercent).toBe(5);
    // 100 * 1.05 = 105, already on a 1.25kg increment
    expect(advice.weightKg).toBe(105);
    expect(advice.explanation).toContain('10 reps');
  });

  it('increases weight by 2.5% for an isolation exercise when all sets hit the top of the range', () => {
    const history = [
      session('2026-07-01', [
        { weightKg: 20, reps: 15, rir: 1 },
        { weightKg: 20, reps: 15, rir: 2 },
      ]),
    ];
    const advice = getStrengthAdvice(isolationConfig, 20, history);
    expect(advice.action).toBe('increase_weight');
    expect(advice.weightChangePercent).toBe(2.5);
    // 20 * 1.025 = 20.5 -> rounds to nearest 1.25 => 20
    expect(advice.weightKg).toBe(20);
  });

  it('does not increase weight when RIR was below target even if reps hit the top of the range', () => {
    const history = [
      session('2026-07-01', [
        { weightKg: 100, reps: 10, rir: 1 },
        { weightKg: 100, reps: 10, rir: 2 },
      ]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('maintain');
    expect(advice.weightKg).toBe(100);
  });

  it('maintains the same weight when reps fall short of the top of the range', () => {
    const history = [
      session('2026-07-01', [
        { weightKg: 100, reps: 8, rir: 2 },
        { weightKg: 100, reps: 7, rir: 2 },
      ]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('maintain');
    expect(advice.weightKg).toBe(100);
    expect(advice.explanation).toContain('meer herhalingen');
  });

  it('maintains weight after only a single session below the range (needs two in a row)', () => {
    const history = [
      session('2026-07-01', [
        { weightKg: 100, reps: 5, rir: 0 },
      ]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('maintain');
    expect(advice.weightKg).toBe(100);
  });

  it('decreases weight by ~10% after two consecutive sessions below the bottom of the range', () => {
    const history = [
      session('2026-07-01', [{ weightKg: 100, reps: 5, rir: 0 }]),
      session('2026-07-04', [{ weightKg: 100, reps: 4, rir: 0 }]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('decrease_weight');
    expect(advice.weightChangePercent).toBe(-10);
    // 100 * 0.9 = 90
    expect(advice.weightKg).toBe(90);
    expect(advice.explanation).toContain('Twee sessies op rij');
  });

  it('does not decrease weight if only the most recent of two sessions fell below the range', () => {
    const history = [
      session('2026-07-01', [{ weightKg: 100, reps: 8, rir: 2 }]),
      session('2026-07-04', [{ weightKg: 100, reps: 5, rir: 0 }]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('maintain');
    expect(advice.weightKg).toBe(100);
  });

  it('only reacts to the two most recent sessions, ignoring older history', () => {
    const history = [
      session('2026-06-20', [{ weightKg: 100, reps: 5, rir: 0 }]),
      session('2026-06-24', [{ weightKg: 100, reps: 5, rir: 0 }]),
      session('2026-07-01', [{ weightKg: 100, reps: 8, rir: 2 }]),
      session('2026-07-04', [{ weightKg: 100, reps: 9, rir: 2 }]),
    ];
    const advice = getStrengthAdvice(compoundConfig, 100, history);
    expect(advice.action).toBe('maintain');
  });

  it('respects a custom weight increment when rounding', () => {
    const history = [
      session('2026-07-01', [{ weightKg: 60, reps: 10, rir: 2 }]),
    ];
    const advice = getStrengthAdvice({ ...compoundConfig, weightIncrementKg: 2.5 }, 60, history);
    // 60 * 1.05 = 63 -> rounds to nearest 2.5 => 62.5
    expect(advice.weightKg).toBe(62.5);
  });
});
