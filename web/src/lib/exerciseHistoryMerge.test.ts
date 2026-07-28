import { getStrengthAdvice, type StrengthExerciseConfig, type StrengthSessionLog } from '@fitness/progression-engine';
import { describe, expect, it } from 'vitest';
import { groupSetLogsIntoSessions } from './exerciseHistoryMerge';

describe('groupSetLogsIntoSessions', () => {
  it('groups sets into one session per workout, sorted oldest first', () => {
    const sessions = groupSetLogsIntoSessions(
      [
        { workoutId: 'w2', dayExerciseId: 'a', setOrder: 1, weightKg: 60, reps: 8, rir: 2 },
        { workoutId: 'w1', dayExerciseId: 'a', setOrder: 1, weightKg: 55, reps: 8, rir: 2 },
        { workoutId: 'w1', dayExerciseId: 'a', setOrder: 2, weightKg: 55, reps: 7, rir: 1 },
      ],
      [
        { id: 'w1', performedAt: '2026-01-01T10:00:00Z' },
        { id: 'w2', performedAt: '2026-01-08T10:00:00Z' },
      ],
    );

    expect(sessions.map((s) => s.workoutId)).toEqual(['w1', 'w2']);
    expect(sessions[0]!.sets).toHaveLength(2);
    expect(sessions[1]!.sets).toHaveLength(1);
  });

  it('drops rows whose workout is missing (defensive, should not happen given the FK)', () => {
    const sessions = groupSetLogsIntoSessions(
      [{ workoutId: 'missing', dayExerciseId: 'a', setOrder: 1, weightKg: 60, reps: 8, rir: 2 }],
      [],
    );
    expect(sessions).toEqual([]);
  });

  it('schemawissel behoudt logs: set_logs tagged with an OLD (archived-program) day_exercise_id still appear once merged with the new program\'s empty history', () => {
    // Simulates: user trained "Barbell Bench Press" under day_exercise "old-1" (old, now-archived program),
    // then switched goals — the new program has a fresh day_exercise "new-1" for the same exercise name with
    // zero of its own logs yet. The caller (fetchExerciseHistoryFromNetwork) is expected to have already
    // resolved BOTH day_exercise ids for the shared exercise name and queried set_logs across both.
    const setLogsAcrossOldAndNewProgram = [
      { workoutId: 'w1', dayExerciseId: 'old-1', setOrder: 1, weightKg: 60, reps: 10, rir: 2 },
      { workoutId: 'w1', dayExerciseId: 'old-1', setOrder: 2, weightKg: 60, reps: 10, rir: 2 },
      // new-1 (the new program's day_exercise) has no set_logs yet — nothing to add for it.
    ];
    const workouts = [{ id: 'w1', performedAt: '2026-06-01T10:00:00Z' }];

    const sessions = groupSetLogsIntoSessions(setLogsAcrossOldAndNewProgram, workouts);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.sets).toHaveLength(2);
    expect(sessions[0]!.sets[0]!.weightKg).toBe(60);
  });

  it('kracht-engine pakt bestaande historie op: getStrengthAdvice gives real progression advice, not "no history", for an exercise whose only logs live under an old program', () => {
    const setLogsFromOldProgram = [
      { workoutId: 'w1', dayExerciseId: 'old-1', setOrder: 1, weightKg: 60, reps: 12, rir: 2 },
      { workoutId: 'w1', dayExerciseId: 'old-1', setOrder: 2, weightKg: 60, reps: 12, rir: 2 },
    ];
    const workouts = [{ id: 'w1', performedAt: '2026-06-01T10:00:00Z' }];

    const sessions = groupSetLogsIntoSessions(setLogsFromOldProgram, workouts);
    const sessionHistory: StrengthSessionLog[] = sessions.map((s) => ({
      date: s.performedAt,
      sets: s.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, rir: set.rir })),
    }));

    const config: StrengthExerciseConfig = {
      repRangeMin: 8,
      repRangeMax: 12,
      targetRIR: 2,
      exerciseType: 'compound',
      weightIncrementKg: 2.5,
    };
    const currentWeightKg = 60;

    const advice = getStrengthAdvice(config, currentWeightKg, sessionHistory);

    // Hit the top of the range at target RIR last time -> the engine should suggest increasing weight,
    // proving it used the old program's history rather than treating this as a brand new exercise
    // (which would instead return action: 'maintain' with the "nog geen sessies gelogd" explanation).
    expect(advice.action).toBe('increase_weight');
    expect(advice.weightKg).toBeGreaterThan(currentWeightKg);
    expect(advice.explanation).not.toContain('Nog geen sessies gelogd');
  });
});
