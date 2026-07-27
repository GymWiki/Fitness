import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import { estimateRecoveryState, type RecoveryEstimate, type RecoverySessionInput, type RecoverySignals } from '@fitness/progression-engine';
import { getAllAsync } from './db';

export type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';

/**
 * Most recent strength session for a muscle group, matched by name across
 * every program ever created (same cross-program approach as `history.ts`,
 * for the same reason: a goal switch shouldn't reset recovery tracking to
 * zero for a muscle group that's trained in both the old and new schema).
 */
async function fetchLastSessionForMuscleGroup(muscleGroup: string): Promise<RecoverySessionInput | null> {
  const exerciseRows = await getAllAsync<{ id: string; exercise_type: string | null }>(
    `select id, exercise_type from day_exercises where muscle_group = ? and kind = 'strength'`,
    [muscleGroup],
  );
  if (exerciseRows.length === 0) return null;

  const exerciseIds = exerciseRows.map((row) => row.id);
  const compoundExerciseIds = new Set(exerciseRows.filter((row) => row.exercise_type === 'compound').map((row) => row.id));

  const setRows = await getAllAsync<{ workout_id: string; day_exercise_id: string; rir: number }>(
    `select workout_id, day_exercise_id, rir from set_logs where day_exercise_id in (${exerciseIds.map(() => '?').join(',')})`,
    exerciseIds,
  );
  if (setRows.length === 0) return null;

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const workoutRows = await getAllAsync<{ id: string; performed_at: string }>(
    `select id, performed_at from workouts where id in (${workoutIds.map(() => '?').join(',')}) order by performed_at desc limit 1`,
    workoutIds,
  );
  const mostRecentWorkout = workoutRows[0];
  if (!mostRecentWorkout) return null;

  const setsInSession = setRows.filter((row) => row.workout_id === mostRecentWorkout.id);
  const averageRIR = setsInSession.reduce((sum, row) => sum + row.rir, 0) / setsInSession.length;
  const hasCompoundLift = setsInSession.some((row) => compoundExerciseIds.has(row.day_exercise_id));

  return {
    performedAt: mostRecentWorkout.performed_at,
    setsCompleted: setsInSession.length,
    averageRIR,
    hasCompoundLift,
  };
}

/** Supercompensation-window estimate for one muscle group. */
export async function fetchRecoveryEstimate(muscleGroup: string, signals: RecoverySignals = {}): Promise<RecoveryEstimate> {
  const lastSession = await fetchLastSessionForMuscleGroup(muscleGroup);
  return estimateRecoveryState(muscleGroup, lastSession, signals);
}

/**
 * A `RecoveryEstimate` for every muscle group the generator uses (not just
 * the ones in today's day) — what the full-body diagram needs, independent
 * of `fetchRecoveryEstimate`'s single-muscle-group use on the day card.
 */
export async function fetchAllMuscleGroupRecoveryEstimates(): Promise<Map<string, RecoveryEstimate>> {
  const estimates = await Promise.all(ALL_MUSCLE_GROUPS.map((muscleGroup) => fetchRecoveryEstimate(muscleGroup)));
  return new Map(ALL_MUSCLE_GROUPS.map((muscleGroup, index) => [muscleGroup, estimates[index]!]));
}
