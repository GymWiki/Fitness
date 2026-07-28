import type { Adjustment, CurrentProgramState } from './types';

/**
 * Mechanically applies a set of adjustments to produce next week's program
 * state. `reduce_days` never deletes a day's exercises — those cascade to
 * `set_logs` in the database and would destroy training history — it only
 * drops the highest-`dayOrder` days from the active set; the caller persists
 * that as an `is_active` flag, not a delete. `deload` doesn't rewrite sets
 * either: it's surfaced as a flag so the session layer can prescribe lighter
 * for one week without permanently altering the program.
 */
export function applyAdjustments(program: CurrentProgramState, adjustments: Adjustment[]): CurrentProgramState {
  const days = program.days.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));

  let daysPerWeek = program.daysPerWeek;
  let isDeloadWeek = false;

  for (const adjustment of adjustments) {
    if (adjustment.type === 'volume_increase' || adjustment.type === 'volume_decrease') {
      if (!adjustment.dayExerciseId || adjustment.newValue === undefined) continue;
      for (const day of days) {
        const exercise = day.exercises.find((e) => e.dayExerciseId === adjustment.dayExerciseId);
        if (exercise) exercise.sets = adjustment.newValue;
      }
    }

    if (adjustment.type === 'reduce_days' && adjustment.newValue !== undefined) {
      daysPerWeek = adjustment.newValue;
    }

    if (adjustment.type === 'deload') {
      isDeloadWeek = true;
    }
  }

  const activeDays = daysPerWeek < days.length ? days.filter((day) => day.dayOrder <= daysPerWeek) : days;

  return { ...program, daysPerWeek, days: activeDays, isDeloadWeek };
}
