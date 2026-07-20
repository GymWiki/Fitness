import { describe, expect, it } from 'vitest';
import { applyAdjustments } from '../src/apply';
import type { CurrentProgramState } from '../src/types';

function program(): CurrentProgramState {
  return {
    daysPerWeek: 4,
    isDeloadWeek: false,
    recentWeeks: [],
    days: [
      {
        programDayId: 'day-1',
        dayOrder: 1,
        exercises: [{ dayExerciseId: 'bench-press', muscleGroup: 'Borst', exerciseType: 'compound', sets: 3 }],
      },
      {
        programDayId: 'day-2',
        dayOrder: 2,
        exercises: [{ dayExerciseId: 'squat', muscleGroup: 'Benen', exerciseType: 'compound', sets: 4 }],
      },
      {
        programDayId: 'day-3',
        dayOrder: 3,
        exercises: [{ dayExerciseId: 'ohp', muscleGroup: 'Schouders', exerciseType: 'compound', sets: 3 }],
      },
      {
        programDayId: 'day-4',
        dayOrder: 4,
        exercises: [{ dayExerciseId: 'deadlift', muscleGroup: 'Rug', exerciseType: 'compound', sets: 3 }],
      },
    ],
  };
}

describe('applyAdjustments', () => {
  it('mutates only the targeted exercise for a volume adjustment', () => {
    const next = applyAdjustments(program(), [
      { type: 'volume_increase', dayExerciseId: 'bench-press', previousValue: 3, newValue: 4, reason: 'test' },
    ]);

    const bench = next.days.flatMap((d) => d.exercises).find((e) => e.dayExerciseId === 'bench-press')!;
    const squat = next.days.flatMap((d) => d.exercises).find((e) => e.dayExerciseId === 'squat')!;
    expect(bench.sets).toBe(4);
    expect(squat.sets).toBe(4); // unchanged
  });

  it('does not mutate the original program (immutability)', () => {
    const original = program();
    applyAdjustments(original, [{ type: 'volume_increase', dayExerciseId: 'bench-press', newValue: 10, reason: 'test' }]);
    expect(original.days[0]!.exercises[0]!.sets).toBe(3);
  });

  it('shrinks daysPerWeek and drops the highest-dayOrder day(s), without deleting any exercise data', () => {
    const next = applyAdjustments(program(), [{ type: 'reduce_days', previousValue: 4, newValue: 3, reason: 'test' }]);

    expect(next.daysPerWeek).toBe(3);
    expect(next.days).toHaveLength(3);
    expect(next.days.map((d) => d.dayOrder)).toEqual([1, 2, 3]);
    expect(next.days.every((d) => d.exercises.length > 0)).toBe(true); // no exercise arrays emptied
  });

  it('flags the week as a deload without changing any sets', () => {
    const next = applyAdjustments(program(), [{ type: 'deload', reason: 'test' }]);
    expect(next.isDeloadWeek).toBe(true);
    expect(next.days.flatMap((d) => d.exercises).every((e) => e.sets === 3 || e.sets === 4)).toBe(true);
  });

  it('leaves the program unchanged when there are no adjustments', () => {
    const next = applyAdjustments(program(), []);
    expect(next.daysPerWeek).toBe(4);
    expect(next.days).toHaveLength(4);
    expect(next.isDeloadWeek).toBe(false);
  });
});
