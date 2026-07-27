import {
  applyAdjustments,
  evaluateWeek,
  type Adjustment,
  type CurrentProgramState,
  type Goal,
  type RecentWeekSummary,
  type WeekDayLog,
  type WeekExerciseLog,
  type WeekLog,
  type WeekSessionLog,
} from '@fitness/adaptation-planner';
import { todayLocalDateString } from './dates';
import { getAllAsync, getFirstAsync, runAsync } from './db';
import { generateId } from './id';

export interface WeekReview {
  programId: string;
  weekNumber: number;
  goal: Goal;
  program: CurrentProgramState;
  adjustments: Adjustment[];
  exerciseNamesById: Map<string, string>;
  dayNamesById: Map<string, string>;
}

/**
 * If the active program has completed a full cycle through its days since
 * the last evaluated week, builds the WeekLog/CurrentProgramState from local
 * data and runs `evaluateWeek`. Returns null when no week is ready yet
 * (fewer than `daysPerWeek` new workouts logged since the last review).
 */
export async function fetchWeekReview(): Promise<WeekReview | null> {
  const programRow = await getFirstAsync<{ id: string; goal: Goal; current_week_number: number }>(
    `select id, goal, current_week_number from programs where status = 'active' order by started_at desc limit 1`,
  );
  if (!programRow) return null;

  const dayRows = await getAllAsync<{ id: string; day_order: number; name: string }>(
    `select id, day_order, name from program_days where program_id = ? and is_active = 1 order by day_order asc`,
    [programRow.id],
  );
  if (dayRows.length === 0) return null;

  const daysPerWeek = dayRows.length;
  const dayIds = dayRows.map((day) => day.id);
  const dayPlaceholders = dayIds.map(() => '?').join(',');

  const workoutCountRow = await getFirstAsync<{ count: number }>(
    `select count(*) as count from workouts where program_day_id in (${dayPlaceholders})`,
    dayIds,
  );
  const completedCycles = Math.floor((workoutCountRow?.count ?? 0) / daysPerWeek);
  if (completedCycles < programRow.current_week_number) return null; // no fresh full cycle since the last review

  const exerciseRows = await getAllAsync<{
    id: string;
    program_day_id: string;
    exercise_name: string;
    muscle_group: string | null;
    exercise_type: 'compound' | 'isolation' | null;
    kind: 'strength' | 'cardio_duration' | 'cardio_interval';
    sets: number | null;
    rep_range_min: number | null;
    rep_range_max: number | null;
    target_rir: number | null;
  }>(
    `select id, program_day_id, exercise_name, muscle_group, exercise_type, kind, sets, rep_range_min, rep_range_max, target_rir
     from day_exercises where program_day_id in (${dayPlaceholders})`,
    dayIds,
  );

  const workoutRows = await getAllAsync<{ id: string; program_day_id: string | null; performed_at: string }>(
    `select id, program_day_id, performed_at from workouts where program_day_id in (${dayPlaceholders})
     order by performed_at desc limit ?`,
    [...dayIds, daysPerWeek],
  );
  if (workoutRows.length < daysPerWeek) return null;

  const workoutIds = workoutRows.map((workout) => workout.id);
  const strengthExerciseIds = exerciseRows.filter((exercise) => exercise.kind === 'strength').map((exercise) => exercise.id);

  const setLogRows =
    strengthExerciseIds.length === 0
      ? []
      : await getAllAsync<{ workout_id: string; day_exercise_id: string; weight_kg: number; reps: number; rir: number }>(
          `select workout_id, day_exercise_id, weight_kg, reps, rir from set_logs
           where workout_id in (${workoutIds.map(() => '?').join(',')}) and day_exercise_id in (${strengthExerciseIds.map(() => '?').join(',')})`,
          [...workoutIds, ...strengthExerciseIds],
        );

  const performedAtByWorkoutId = new Map(workoutRows.map((workout) => [workout.id, workout.performed_at]));
  const completedDayIds = new Set(workoutRows.map((workout) => workout.program_day_id));

  const weekDays: WeekDayLog[] = dayRows.map((day) => ({
    programDayId: day.id,
    dayOrder: day.day_order,
    completed: completedDayIds.has(day.id),
  }));

  // Group this week's set_logs into one session per (exercise, workout).
  const sessionsByExercise = new Map<string, Map<string, WeekSessionLog>>();
  for (const row of setLogRows) {
    const performedAt = performedAtByWorkoutId.get(row.workout_id);
    if (!performedAt) continue;
    let sessionsByWorkout = sessionsByExercise.get(row.day_exercise_id);
    if (!sessionsByWorkout) {
      sessionsByWorkout = new Map();
      sessionsByExercise.set(row.day_exercise_id, sessionsByWorkout);
    }
    let session = sessionsByWorkout.get(row.workout_id);
    if (!session) {
      session = { date: performedAt, sets: [] };
      sessionsByWorkout.set(row.workout_id, session);
    }
    session.sets.push({ weightKg: row.weight_kg, reps: row.reps, rir: row.rir });
  }

  const strengthExerciseRows = exerciseRows.filter((exercise) => exercise.kind === 'strength');

  const weekExercises: WeekExerciseLog[] = strengthExerciseRows.map((exercise) => ({
    dayExerciseId: exercise.id,
    muscleGroup: exercise.muscle_group ?? 'Onbekend',
    exerciseType: exercise.exercise_type ?? 'compound',
    currentSets: exercise.sets ?? 0,
    repRangeMin: exercise.rep_range_min ?? 0,
    repRangeMax: exercise.rep_range_max ?? 0,
    targetRIR: exercise.target_rir ?? 1,
    sessions: [...(sessionsByExercise.get(exercise.id)?.values() ?? [])],
  }));

  const weekLog: WeekLog = { weekNumber: programRow.current_week_number, days: weekDays, exercises: weekExercises };

  // Reconstruct RecentWeekSummary[] for every week strictly before this one from the program_adjustments log.
  const adjustmentRows = await getAllAsync<{ week_number: number; is_deload: number; adjustment_type: string }>(
    `select week_number, is_deload, adjustment_type from program_adjustments where program_id = ? and week_number < ?`,
    [programRow.id, programRow.current_week_number],
  );

  const recentWeeks: RecentWeekSummary[] = [];
  for (let weekNumber = 1; weekNumber < programRow.current_week_number; weekNumber++) {
    const rowsForWeek = adjustmentRows.filter((row) => row.week_number === weekNumber);
    recentWeeks.push({
      weekNumber,
      wasDeload: rowsForWeek.some((row) => row.is_deload === 1),
      hasRecoverySignal: rowsForWeek.some((row) => row.adjustment_type === 'volume_decrease'),
    });
  }

  const program: CurrentProgramState = {
    daysPerWeek,
    isDeloadWeek: false,
    recentWeeks,
    days: dayRows.map((day) => ({
      programDayId: day.id,
      dayOrder: day.day_order,
      exercises: strengthExerciseRows
        .filter((exercise) => exercise.program_day_id === day.id)
        .map((exercise) => ({
          dayExerciseId: exercise.id,
          muscleGroup: exercise.muscle_group ?? 'Onbekend',
          exerciseType: exercise.exercise_type ?? 'compound',
          sets: exercise.sets ?? 0,
        })),
    })),
  };

  const goal = programRow.goal;
  const adjustments = evaluateWeek(weekLog, program, goal);

  const exerciseNamesById = new Map(exerciseRows.map((exercise) => [exercise.id, exercise.exercise_name]));
  const dayNamesById = new Map(dayRows.map((day) => [day.id, day.name]));

  return { programId: programRow.id, weekNumber: programRow.current_week_number, goal, program, adjustments, exerciseNamesById, dayNamesById };
}

/** Applies a (possibly user-edited) set of adjustments, persists the changes, and advances the week counter. */
export async function applyWeekReview(review: WeekReview, adjustments: Adjustment[]): Promise<void> {
  const nextProgram = applyAdjustments(review.program, adjustments);

  const originalSetsByExerciseId = new Map(
    review.program.days.flatMap((day) => day.exercises).map((exercise) => [exercise.dayExerciseId, exercise.sets]),
  );
  for (const day of nextProgram.days) {
    for (const exercise of day.exercises) {
      if (originalSetsByExerciseId.get(exercise.dayExerciseId) === exercise.sets) continue;
      await runAsync('update day_exercises set sets = ? where id = ?', [exercise.sets, exercise.dayExerciseId]);
    }
  }

  const activeDayIds = new Set(nextProgram.days.map((day) => day.programDayId));
  const deactivatedDayIds = review.program.days.map((day) => day.programDayId).filter((id) => !activeDayIds.has(id));
  for (const dayId of deactivatedDayIds) {
    await runAsync('update program_days set is_active = 0 where id = ?', [dayId]);
  }

  if (adjustments.length > 0) {
    const now = new Date().toISOString();
    for (const adjustment of adjustments) {
      await runAsync(
        `insert into program_adjustments (id, program_id, day_exercise_id, adjustment_type, previous_value, new_value, reason, effective_at, week_number, is_deload, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          review.programId,
          adjustment.dayExerciseId ?? null,
          adjustment.type,
          adjustment.previousValue !== undefined ? JSON.stringify(adjustment.previousValue) : null,
          adjustment.newValue !== undefined ? JSON.stringify(adjustment.newValue) : null,
          adjustment.explanation,
          now.slice(0, 10),
          review.weekNumber,
          adjustment.type === 'deload' ? 1 : 0,
          now,
        ],
      );
    }
  }

  await runAsync('update programs set current_week_number = ? where id = ?', [review.weekNumber + 1, review.programId]);

  // Adjustments only ever change what's scheduled from tomorrow onward — a
  // day that's already passed (or is today) keeps whatever was actually
  // planned for it, never retroactively. Clearing just the strictly-future
  // planned/rest rows lets `ensureScheduledWindow` regenerate them the next
  // time it runs, against the now-updated program (fewer active days,
  // different set counts, etc.) instead of the stale plan from before.
  await runAsync(
    `delete from scheduled_sessions where program_id = ? and status in ('planned', 'rest') and scheduled_date > ?`,
    [review.programId, todayLocalDateString()],
  );
}
