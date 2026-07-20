import type { CardioLog, CardioSessionType } from '@fitness/progression-engine';
import { supabase } from './supabase';

export interface HistorySet {
  setOrder: number;
  weightKg: number;
  reps: number;
  rir: number;
}

export interface HistorySession {
  workoutId: string;
  /** ISO date string, from workouts.performed_at. */
  performedAt: string;
  sets: HistorySet[];
}

/** Past sessions for a single exercise, oldest first, grouped by workout. RLS scopes this to the owning user. */
export async function fetchExerciseHistory(dayExerciseId: string): Promise<HistorySession[]> {
  const { data: setRows, error: setLogsError } = await supabase
    .from('set_logs')
    .select('workout_id, set_order, weight_kg, reps, rir')
    .eq('day_exercise_id', dayExerciseId)
    .order('set_order', { ascending: true });
  if (setLogsError) throw setLogsError;
  if (!setRows || setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, performed_at')
    .in('id', workoutIds);
  if (workoutsError) throw workoutsError;

  const performedAtByWorkoutId = new Map((workoutRows ?? []).map((row) => [row.id, row.performed_at as string]));

  const sessionsByWorkout = new Map<string, HistorySession>();
  for (const row of setRows) {
    const performedAt = performedAtByWorkoutId.get(row.workout_id);
    if (!performedAt) continue; // shouldn't happen (workout_id is a required FK), but keeps this defensive
    let session = sessionsByWorkout.get(row.workout_id);
    if (!session) {
      session = { workoutId: row.workout_id, performedAt, sets: [] };
      sessionsByWorkout.set(row.workout_id, session);
    }
    session.sets.push({ setOrder: row.set_order, weightKg: row.weight_kg, reps: row.reps, rir: row.rir });
  }

  return [...sessionsByWorkout.values()].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
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
 * date column of its own, same as set_logs. RLS scopes this to the owning user.
 */
export async function fetchCardioHistory(dayExerciseId: string): Promise<CardioHistoryEntry[]> {
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
