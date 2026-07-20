import type { CardioLog, CardioSessionType } from '@fitness/progression-engine';
import { groupSetLogsIntoSessions } from './exerciseHistoryMerge';
import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

export type { HistorySession, HistorySet } from './exerciseHistoryMerge';

/**
 * Past sessions for an exercise, oldest first, grouped by workout —
 * matched by exercise NAME across every program the user has ever had
 * (active and archived), not by a single day_exercise_id. A goal switch
 * archives the old program and creates a new one with fresh day_exercise
 * rows, so matching by name (instead of by the row that happens to exist
 * right now) is what keeps history — and therefore the strength advice —
 * continuous across that switch. RLS scopes every query here to the owning
 * user. Cached (keyed by user+exercise name, stable across switches) so the
 * strength advice can still be computed without a connection.
 */
export async function fetchExerciseHistory(userId: string, exerciseName: string) {
  return fetchWithCache(`exercise_history:${userId}:${exerciseName}`, () => fetchExerciseHistoryFromNetwork(userId, exerciseName));
}

async function fetchExerciseHistoryFromNetwork(userId: string, exerciseName: string) {
  const { data: programRows, error: programsError } = await supabase.from('programs').select('id').eq('user_id', userId);
  if (programsError) throw programsError;
  const programIds = (programRows ?? []).map((row) => row.id);
  if (programIds.length === 0) return [];

  const { data: dayRows, error: daysError } = await supabase.from('program_days').select('id').in('program_id', programIds);
  if (daysError) throw daysError;
  const dayIds = (dayRows ?? []).map((row) => row.id);
  if (dayIds.length === 0) return [];

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('day_exercises')
    .select('id')
    .eq('exercise_name', exerciseName)
    .in('program_day_id', dayIds);
  if (exercisesError) throw exercisesError;
  const dayExerciseIds = (exerciseRows ?? []).map((row) => row.id);
  if (dayExerciseIds.length === 0) return [];

  const { data: setRows, error: setLogsError } = await supabase
    .from('set_logs')
    .select('workout_id, day_exercise_id, set_order, weight_kg, reps, rir')
    .in('day_exercise_id', dayExerciseIds)
    .order('set_order', { ascending: true });
  if (setLogsError) throw setLogsError;
  if (!setRows || setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, performed_at')
    .in('id', workoutIds);
  if (workoutsError) throw workoutsError;

  return groupSetLogsIntoSessions(
    setRows.map((row) => ({
      workoutId: row.workout_id,
      dayExerciseId: row.day_exercise_id,
      setOrder: row.set_order,
      weightKg: row.weight_kg,
      reps: row.reps,
      rir: row.rir,
    })),
    (workoutRows ?? []).map((row) => ({ id: row.id, performedAt: row.performed_at })),
  );
}

export interface CardioHistoryEntry extends CardioLog {
  id: string;
  workoutId: string;
}

/**
 * Past cardio sessions for a single exercise, oldest first. Shaped as
 * `CardioLog[]` so it can be passed straight into the progression-engine
 * functions (`computeWeeklyDistribution`, `adviseCardioProgression`).
 * `date` comes from the parent workout's `performed_at` — cardio_logs has no
 * date column of its own, same as set_logs. RLS scopes this to the owning
 * user. Cached so the cardio advice can still be computed without a connection.
 */
export async function fetchCardioHistory(dayExerciseId: string): Promise<CardioHistoryEntry[]> {
  return fetchWithCache(`cardio_history:${dayExerciseId}`, () => fetchCardioHistoryFromNetwork(dayExerciseId));
}

async function fetchCardioHistoryFromNetwork(dayExerciseId: string): Promise<CardioHistoryEntry[]> {
  const { data: cardioRows, error: cardioError } = await supabase
    .from('cardio_logs')
    .select('id, workout_id, session_type, duration_minutes, rpe, distance_km, avg_heart_rate, rounds')
    .eq('day_exercise_id', dayExerciseId);
  if (cardioError) throw cardioError;
  if (!cardioRows || cardioRows.length === 0) return [];

  const workoutIds = [...new Set(cardioRows.map((row) => row.workout_id))];
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, performed_at')
    .in('id', workoutIds);
  if (workoutsError) throw workoutsError;

  const performedAtByWorkoutId = new Map((workoutRows ?? []).map((row) => [row.id, row.performed_at as string]));

  const entries: CardioHistoryEntry[] = [];
  for (const row of cardioRows) {
    const performedAt = performedAtByWorkoutId.get(row.workout_id);
    if (!performedAt) continue; // shouldn't happen (workout_id is a required FK), but keeps this defensive
    entries.push({
      id: row.id,
      workoutId: row.workout_id,
      date: performedAt,
      type: row.session_type as CardioSessionType,
      durationMinutes: row.duration_minutes,
      rpe: row.rpe,
      distanceKm: row.distance_km ?? undefined,
      avgHeartRate: row.avg_heart_rate ?? undefined,
      rounds: row.rounds ?? undefined,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
