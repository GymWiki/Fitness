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
