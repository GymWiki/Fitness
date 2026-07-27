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
 * A `RecoveryEstimate` for every muscle group the generator uses (not just
 * the ones in today's day) — what the full-body diagram needs, independent
 * of `fetchRecoveryEstimate`'s single-muscle-group use on the day card.
 */
export async function fetchAllMuscleGroupRecoveryEstimates(userId: string): Promise<Map<string, RecoveryEstimate>> {
  const estimates = await Promise.all(ALL_MUSCLE_GROUPS.map((muscleGroup) => fetchRecoveryEstimate(userId, muscleGroup)));
  return new Map(ALL_MUSCLE_GROUPS.map((muscleGroup, index) => [muscleGroup, estimates[index]!]));
}
