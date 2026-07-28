import { describe, expect, it } from 'vitest';
import { evaluateWeek } from '../src/evaluate';
import type { CurrentProgramState, WeekExerciseLog, WeekLog } from '../src/types';

function baseProgram(overrides: Partial<CurrentProgramState> = {}): CurrentProgramState {
  return {
    daysPerWeek: 4,
    days: [],
    recentWeeks: [],
    isDeloadWeek: false,
    ...overrides,
  };
}

function exercise(overrides: Partial<WeekExerciseLog> & Pick<WeekExerciseLog, 'dayExerciseId' | 'muscleGroup'>): WeekExerciseLog {
  return {
    exerciseType: 'compound',
    currentSets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    targetRIR: 1,
    sessions: [],
    ...overrides,
  };
}

function daysAllCompleted(count: number): WeekLog['days'] {
  return Array.from({ length: count }, (_, i) => ({ programDayId: `day-${i + 1}`, dayOrder: i + 1, completed: true }));
}

describe('evaluateWeek - volume', () => {
  it('proposes exactly +1 set on the right muscle group when every target was hit, and only for hypertrophy', () => {
    const weekLogs: WeekLog = {
      weekNumber: 3,
      days: daysAllCompleted(4),
      exercises: [
        exercise({
          dayExerciseId: 'bench-press',
          muscleGroup: 'Borst',
          exerciseType: 'compound',
          currentSets: 3,
          sessions: [{ date: '2026-07-10', sets: [{ weightKg: 60, reps: 12, rir: 1 }, { weightKg: 60, reps: 12, rir: 1 }] }],
        }),
        exercise({
          dayExerciseId: 'cable-fly',
          muscleGroup: 'Borst',
          exerciseType: 'isolation',
          currentSets: 3,
          sessions: [{ date: '2026-07-10', sets: [{ weightKg: 20, reps: 12, rir: 1 }, { weightKg: 20, reps: 12, rir: 1 }] }],
        }),
      ],
    };

    const adjustments = evaluateWeek(weekLogs, baseProgram(), 'hypertrophy');
    const volumeAdjustments = adjustments.filter((a) => a.type === 'volume_increase');

    expect(volumeAdjustments).toHaveLength(1);
    expect(volumeAdjustments[0]!.dayExerciseId).toBe('bench-press'); // the compound lift, not the isolation accessory
    expect(volumeAdjustments[0]!.previousValue).toBe(3);
    expect(volumeAdjustments[0]!.newValue).toBe(4);
  });

  it('does not propose a volume increase for non-hypertrophy goals, even when every target was hit', () => {
    const weekLogs: WeekLog = {
      weekNumber: 3,
      days: daysAllCompleted(4),
      exercises: [
        exercise({
          dayExerciseId: 'bench-press',
          muscleGroup: 'Borst',
          sessions: [{ date: '2026-07-10', sets: [{ weightKg: 60, reps: 12, rir: 1 }] }],
        }),
      ],
    };

    const adjustments = evaluateWeek(weekLogs, baseProgram(), 'strength');
    expect(adjustments.some((a) => a.type === 'volume_increase')).toBe(false);
  });

  it('proposes a volume decrease instead of an increase when performance is declining', () => {
    const weekLogs: WeekLog = {
      weekNumber: 3,
      days: daysAllCompleted(4),
      exercises: [
        exercise({
          dayExerciseId: 'squat',
          muscleGroup: 'Benen',
          currentSets: 4,
          repRangeMin: 8,
          repRangeMax: 12,
          sessions: [{ date: '2026-07-10', sets: [{ weightKg: 80, reps: 6, rir: 1 }] }], // fell below repRangeMin
        }),
      ],
    };

    const adjustments = evaluateWeek(weekLogs, baseProgram(), 'hypertrophy');
    const volumeAdjustments = adjustments.filter((a) => a.type === 'volume_increase' || a.type === 'volume_decrease');

    expect(volumeAdjustments).toHaveLength(1);
    expect(volumeAdjustments[0]!.type).toBe('volume_decrease');
    expect(volumeAdjustments[0]!.newValue).toBe(3);
  });
});

describe('evaluateWeek - adherence', () => {
  it('shrinks the schedule when half or more of the sessions were skipped, and skips volume adjustments that pass', () => {
    const weekLogs: WeekLog = {
      weekNumber: 3,
      days: [
        { programDayId: 'd1', dayOrder: 1, completed: true },
        { programDayId: 'd2', dayOrder: 2, completed: false },
        { programDayId: 'd3', dayOrder: 3, completed: true },
        { programDayId: 'd4', dayOrder: 4, completed: false },
      ],
      exercises: [
        exercise({
          dayExerciseId: 'bench-press',
          muscleGroup: 'Borst',
          sessions: [{ date: '2026-07-10', sets: [{ weightKg: 60, reps: 12, rir: 1 }] }], // would otherwise trigger +1 set
        }),
      ],
    };

    const adjustments = evaluateWeek(weekLogs, baseProgram({ daysPerWeek: 4 }), 'hypertrophy');
    const reduceDays = adjustments.find((a) => a.type === 'reduce_days');

    expect(reduceDays).toBeDefined();
    expect(reduceDays!.previousValue).toBe(4);
    expect(reduceDays!.newValue).toBe(3);
    expect(adjustments.some((a) => a.type === 'volume_increase')).toBe(false);
  });

  it('does not shrink the schedule when fewer than half of the sessions were skipped', () => {
    const weekLogs: WeekLog = {
      weekNumber: 3,
      days: [
        { programDayId: 'd1', dayOrder: 1, completed: true },
        { programDayId: 'd2', dayOrder: 2, completed: true },
        { programDayId: 'd3', dayOrder: 3, completed: true },
        { programDayId: 'd4', dayOrder: 4, completed: false },
      ],
      exercises: [],
    };

    const adjustments = evaluateWeek(weekLogs, baseProgram({ daysPerWeek: 4 }), 'hypertrophy');
    expect(adjustments.some((a) => a.type === 'reduce_days')).toBe(false);
  });

  it('still evaluates deload independently, even when the schedule is being shrunk', () => {
    const weekLogs: WeekLog = {
      weekNumber: 6,
      days: [
        { programDayId: 'd1', dayOrder: 1, completed: false },
        { programDayId: 'd2', dayOrder: 2, completed: false },
        { programDayId: 'd3', dayOrder: 3, completed: true },
        { programDayId: 'd4', dayOrder: 4, completed: true },
      ],
      exercises: [],
    };
    const recentWeeks = [1, 2, 3, 4, 5].map((weekNumber) => ({ weekNumber, wasDeload: false, hasRecoverySignal: false }));

    const adjustments = evaluateWeek(weekLogs, baseProgram({ daysPerWeek: 4, recentWeeks }), 'hypertrophy');

    expect(adjustments.some((a) => a.type === 'reduce_days')).toBe(true);
    expect(adjustments.some((a) => a.type === 'deload')).toBe(true);
  });
});
