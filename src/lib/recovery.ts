import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import { estimateRecoveryState, type RecoveryEstimate, type RecoverySessionInput, type RecoverySignals } from '@fitness/progression-engine';
import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

export type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';

/**
 * Most recent strength session for a muscle group, matched by name across
 * every program the user has ever had (same cross-program approach as
 * `history.ts`, for the same reason: a goal switch shouldn't reset recovery
 * tracking to zero for a muscle group that's trained in both the old and
 * new schema).
 */
async function fetchLastSessionForMuscleGroup(userId: string, muscleGroup: string): Promise<RecoverySessionInput | null> {
  const { data: programRows, error: programsError } = await supabase.from('programs').select('id').eq('user_id', userId);
  if (programsError) throw programsError;
  const programIds = (programRows ?? []).map((row) => row.id);
  if (programIds.length === 0) return null;

  const { data: dayRows, error: daysError } = await supabase.from('program_days').select('id').in('program_id', programIds);
  if (daysError) throw daysError;
  const dayIds = (dayRows ?? []).map((row) => row.id);
  if (dayIds.length === 0) return null;

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('day_exercises')
    .select('id, exercise_type')
    .eq('muscle_group', muscleGroup)
    .eq('kind', 'strength')
    .in('program_day_id', dayIds);
  if (exercisesError) throw exercisesError;
  if (!exerciseRows || exerciseRows.length === 0) return null;

  const exerciseIds = exerciseRows.map((row) => row.id);
  const compoundExerciseIds = new Set(exerciseRows.filter((row) => row.exercise_type === 'compound').map((row) => row.id));

  const { data: setRows, error: setLogsError } = await supabase
    .from('set_logs')
    .select('workout_id, day_exercise_id, rir')
    .in('day_exercise_id', exerciseIds);
  if (setLogsError) throw setLogsError;
  if (!setRows || setRows.length === 0) return null;

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, performed_at')
    .in('id', workoutIds)
    .order('performed_at', { ascending: false })
    .limit(1);
  if (workoutsError) throw workoutsError;
  const mostRecentWorkout = workoutRows?.[0];
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

/**
 * Supercompensation-window estimate for one muscle group, for the current
 * user. Cached (network-first) so it degrades gracefully offline, same
 * pattern as the rest of the read layer.
 */
export async function fetchRecoveryEstimate(
  userId: string,
  muscleGroup: string,
  signals: RecoverySignals = {},
): Promise<RecoveryEstimate> {
  const lastSession = await fetchWithCache(`recovery_session:${userId}:${muscleGroup}`, () =>
    fetchLastSessionForMuscleGroup(userId, muscleGroup),
  );
  return estimateRecoveryState(muscleGroup, lastSession, signals);
}

/**
 * Same last-session lookup as `fetchLastSessionForMuscleGroup`, but for every
 * muscle group in one pass instead of one full round of queries per group —
 * `programs`/`program_days`/`day_exercises`/`set_logs`/`workouts` are each
 * queried once total and then grouped client-side, instead of the readiness
 * rings triggering 10x the query volume (5 queries × 10 muscle groups) for
 * data that's identical across groups except the final grouping step.
 * Returns entries (not a `Map`) so the result stays cache-safe — `Map`
 * doesn't round-trip through `JSON.stringify`.
 */
async function fetchLastSessionsByMuscleGroup(userId: string): Promise<Array<[string, RecoverySessionInput | null]>> {
  const empty = ALL_MUSCLE_GROUPS.map((muscleGroup): [string, RecoverySessionInput | null] => [muscleGroup, null]);

  const { data: programRows, error: programsError } = await supabase.from('programs').select('id').eq('user_id', userId);
  if (programsError) throw programsError;
  const programIds = (programRows ?? []).map((row) => row.id);
  if (programIds.length === 0) return empty;

  const { data: dayRows, error: daysError } = await supabase.from('program_days').select('id').in('program_id', programIds);
  if (daysError) throw daysError;
  const dayIds = (dayRows ?? []).map((row) => row.id);
  if (dayIds.length === 0) return empty;

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('day_exercises')
    .select('id, exercise_type, muscle_group')
    .eq('kind', 'strength')
    .in('program_day_id', dayIds);
  if (exercisesError) throw exercisesError;
  if (!exerciseRows || exerciseRows.length === 0) return empty;

  const exerciseIds = exerciseRows.map((row) => row.id);
  const { data: setRows, error: setLogsError } = await supabase
    .from('set_logs')
    .select('workout_id, day_exercise_id, rir')
    .in('day_exercise_id', exerciseIds);
  if (setLogsError) throw setLogsError;
  if (!setRows || setRows.length === 0) return empty;

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const { data: workoutRows, error: workoutsError } = await supabase.from('workouts').select('id, performed_at').in('id', workoutIds);
  if (workoutsError) throw workoutsError;
  // ISO 8601 timestamps sort correctly as strings, same ordering `.order('performed_at', { ascending: false })` gave per-group before.
  const performedAtByWorkoutId = new Map((workoutRows ?? []).map((row) => [row.id, row.performed_at]));

  return ALL_MUSCLE_GROUPS.map((muscleGroup): [string, RecoverySessionInput | null] => {
    const exercisesForGroup = exerciseRows.filter((row) => row.muscle_group === muscleGroup);
    if (exercisesForGroup.length === 0) return [muscleGroup, null];
    const compoundExerciseIds = new Set(exercisesForGroup.filter((row) => row.exercise_type === 'compound').map((row) => row.id));

    const exerciseIdsForGroup = new Set(exercisesForGroup.map((row) => row.id));
    const setsForGroup = setRows.filter((row) => exerciseIdsForGroup.has(row.day_exercise_id));
    if (setsForGroup.length === 0) return [muscleGroup, null];

    let mostRecentWorkoutId: string | null = null;
    let mostRecentPerformedAt: string | null = null;
    for (const workoutId of new Set(setsForGroup.map((row) => row.workout_id))) {
      const performedAt = performedAtByWorkoutId.get(workoutId);
      if (!performedAt) continue;
      if (!mostRecentPerformedAt || performedAt > mostRecentPerformedAt) {
        mostRecentWorkoutId = workoutId;
        mostRecentPerformedAt = performedAt;
      }
    }
    if (!mostRecentWorkoutId || !mostRecentPerformedAt) return [muscleGroup, null];

    const setsInSession = setsForGroup.filter((row) => row.workout_id === mostRecentWorkoutId);
    const averageRIR = setsInSession.reduce((sum, row) => sum + row.rir, 0) / setsInSession.length;
    const hasCompoundLift = setsInSession.some((row) => compoundExerciseIds.has(row.day_exercise_id));

    return [muscleGroup, { performedAt: mostRecentPerformedAt, setsCompleted: setsInSession.length, averageRIR, hasCompoundLift }];
  });
}

/**
 * A `RecoveryEstimate` for every muscle group the generator uses (not just
 * the ones in today's day) — what the readiness rings need, independent of
 * `fetchRecoveryEstimate`'s single-muscle-group use on the day card.
 */
export async function fetchAllMuscleGroupRecoveryEstimates(userId: string): Promise<Map<string, RecoveryEstimate>> {
  const entries = await fetchWithCache(`recovery_sessions_by_group:${userId}`, () => fetchLastSessionsByMuscleGroup(userId));
  return new Map(entries.map(([muscleGroup, lastSession]) => [muscleGroup, estimateRecoveryState(muscleGroup, lastSession, {})]));
}
