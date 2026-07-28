/**
 * Pure grouping logic for exercise history, deliberately factored out of
 * `history.ts` so it can be unit-tested without a Supabase connection. This
 * is the piece that makes "switching goals keeps your history usable"
 * verifiable: feed it set_logs rows from day_exercise ids that span
 * multiple programs (an old, now-archived one and a new active one, both
 * containing the same-named exercise) and it groups them into one
 * continuous, chronologically-sorted session history — exactly what
 * `getStrengthAdvice` needs to keep giving real advice instead of treating
 * the exercise as brand new.
 */

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

export interface SetLogRow {
  workoutId: string;
  dayExerciseId: string;
  setOrder: number;
  weightKg: number;
  reps: number;
  rir: number;
}

export interface WorkoutRef {
  id: string;
  performedAt: string;
}

/** Groups raw set_logs rows into one session per workout, oldest first. */
export function groupSetLogsIntoSessions(setLogs: SetLogRow[], workouts: WorkoutRef[]): HistorySession[] {
  const performedAtByWorkoutId = new Map(workouts.map((workout) => [workout.id, workout.performedAt]));

  const sessionsByWorkout = new Map<string, HistorySession>();
  for (const row of setLogs) {
    const performedAt = performedAtByWorkoutId.get(row.workoutId);
    if (!performedAt) continue; // shouldn't happen (workout_id is a required FK), but keeps this defensive
    let session = sessionsByWorkout.get(row.workoutId);
    if (!session) {
      session = { workoutId: row.workoutId, performedAt, sets: [] };
      sessionsByWorkout.set(row.workoutId, session);
    }
    session.sets.push({ setOrder: row.setOrder, weightKg: row.weightKg, reps: row.reps, rir: row.rir });
  }

  return [...sessionsByWorkout.values()].sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}
