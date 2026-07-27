import { toLocalDateString } from './dates';
import { runAsync } from './db';
import { generateId } from './id';

/** Creates a workout row and marks today's scheduled session (if any) done. Returns the new workout's id. */
export async function createWorkout(programDayId: string, performedAt: string): Promise<string> {
  const workoutId = generateId();
  await runAsync('insert into workouts (id, program_day_id, performed_at, created_at) values (?, ?, ?, ?)', [
    workoutId,
    programDayId,
    performedAt,
    new Date().toISOString(),
  ]);

  // Best-effort: a no-op when there's no calendar schedule yet (e.g. accounts
  // that skipped the preferred-weekdays onboarding step).
  await runAsync(`update scheduled_sessions set status = 'done', workout_id = ? where scheduled_date = ?`, [
    workoutId,
    toLocalDateString(new Date(performedAt)),
  ]);

  return workoutId;
}

export interface LogSetInput {
  workoutId: string;
  dayExerciseId: string;
  setOrder: number;
  weightKg: number;
  reps: number;
  rir: number;
}

export async function logSet(input: LogSetInput): Promise<string> {
  const setLogId = generateId();
  await runAsync(
    `insert into set_logs (id, workout_id, day_exercise_id, set_order, weight_kg, reps, rir, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [setLogId, input.workoutId, input.dayExerciseId, input.setOrder, input.weightKg, input.reps, input.rir, new Date().toISOString()],
  );
  return setLogId;
}

export interface LogCardioInput {
  workoutId: string;
  dayExerciseId: string;
  sessionType: string;
  durationMinutes: number;
  rpe: number;
  distanceKm?: number;
  avgHeartRate?: number;
  rounds?: number;
}

export async function logCardio(input: LogCardioInput): Promise<string> {
  const cardioLogId = generateId();
  await runAsync(
    `insert into cardio_logs (id, workout_id, day_exercise_id, session_type, duration_minutes, distance_km, rpe, avg_heart_rate, rounds, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cardioLogId,
      input.workoutId,
      input.dayExerciseId,
      input.sessionType,
      input.durationMinutes,
      input.distanceKm ?? null,
      input.rpe,
      input.avgHeartRate ?? null,
      input.rounds ?? null,
      new Date().toISOString(),
    ],
  );
  return cardioLogId;
}
