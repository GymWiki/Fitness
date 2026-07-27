import type { CardioLog, CardioSessionType } from '@fitness/progression-engine';
import { getAllAsync } from './db';
import { groupSetLogsIntoSessions } from './exerciseHistoryMerge';

export type { HistorySession, HistorySet } from './exerciseHistoryMerge';

/**
 * Past sessions for an exercise, oldest first, grouped by workout — matched
 * by exercise NAME across every program ever created (active and archived),
 * not by a single day_exercise_id. A goal switch archives the old program
 * and creates a new one with fresh day_exercise rows, so matching by name
 * (instead of by the row that happens to exist right now) is what keeps
 * history — and therefore the strength advice — continuous across that
 * switch.
 */
export async function fetchExerciseHistory(exerciseName: string) {
  const exerciseRows = await getAllAsync<{ id: string }>('select id from day_exercises where exercise_name = ?', [exerciseName]);
  const dayExerciseIds = exerciseRows.map((row) => row.id);
  if (dayExerciseIds.length === 0) return [];

  const placeholders = dayExerciseIds.map(() => '?').join(',');
  const setRows = await getAllAsync<{ workout_id: string; day_exercise_id: string; set_order: number; weight_kg: number; reps: number; rir: number }>(
    `select workout_id, day_exercise_id, set_order, weight_kg, reps, rir from set_logs where day_exercise_id in (${placeholders}) order by set_order asc`,
    dayExerciseIds,
  );
  if (setRows.length === 0) return [];

  const workoutIds = [...new Set(setRows.map((row) => row.workout_id))];
  const workoutRows = await getAllAsync<{ id: string; performed_at: string }>(
    `select id, performed_at from workouts where id in (${workoutIds.map(() => '?').join(',')})`,
    workoutIds,
  );

  return groupSetLogsIntoSessions(
    setRows.map((row) => ({
      workoutId: row.workout_id,
      dayExerciseId: row.day_exercise_id,
      setOrder: row.set_order,
      weightKg: row.weight_kg,
      reps: row.reps,
      rir: row.rir,
    })),
    workoutRows.map((row) => ({ id: row.id, performedAt: row.performed_at })),
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
 * date column of its own, same as set_logs.
 */
export async function fetchCardioHistory(dayExerciseId: string): Promise<CardioHistoryEntry[]> {
  const cardioRows = await getAllAsync<{
    id: string;
    workout_id: string;
    session_type: string;
    duration_minutes: number;
    rpe: number;
    distance_km: number | null;
    avg_heart_rate: number | null;
    rounds: number | null;
  }>(
    'select id, workout_id, session_type, duration_minutes, rpe, distance_km, avg_heart_rate, rounds from cardio_logs where day_exercise_id = ?',
    [dayExerciseId],
  );
  if (cardioRows.length === 0) return [];

  const workoutIds = [...new Set(cardioRows.map((row) => row.workout_id))];
  const workoutRows = await getAllAsync<{ id: string; performed_at: string }>(
    `select id, performed_at from workouts where id in (${workoutIds.map(() => '?').join(',')})`,
    workoutIds,
  );
  const performedAtByWorkoutId = new Map(workoutRows.map((row) => [row.id, row.performed_at]));

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
