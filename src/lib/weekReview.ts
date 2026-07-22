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
import { supabase } from './supabase';

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
 * the last evaluated week, builds the WeekLog/CurrentProgramState from
 * Supabase data and runs `evaluateWeek`. Returns null when no week is ready
 * yet (fewer than `daysPerWeek` new workouts logged since the last review).
 */
export async function fetchWeekReview(userId: string): Promise<WeekReview | null> {
  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .select('id, goal, current_week_number')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programError) throw programError;
  if (!programRow) return null;

  const { data: dayRows, error: daysError } = await supabase
    .from('program_days')
    .select('id, day_order, name')
    .eq('program_id', programRow.id)
    .eq('is_active', true)
    .order('day_order', { ascending: true });
  if (daysError) throw daysError;
  if (!dayRows || dayRows.length === 0) return null;

  const daysPerWeek = dayRows.length;
  const dayIds = dayRows.map((day) => day.id);

  const { count: totalWorkoutCount, error: workoutCountError } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .in('program_day_id', dayIds);
  if (workoutCountError) throw workoutCountError;

  const completedCycles = Math.floor((totalWorkoutCount ?? 0) / daysPerWeek);
  if (completedCycles < programRow.current_week_number) return null; // no fresh full cycle since the last review

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('day_exercises')
    .select('id, program_day_id, exercise_name, muscle_group, exercise_type, kind, sets, rep_range_min, rep_range_max, target_rir')
    .in('program_day_id', dayIds);
  if (exercisesError) throw exercisesError;

  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id, program_day_id, performed_at')
    .in('program_day_id', dayIds)
    .order('performed_at', { ascending: false })
    .limit(daysPerWeek);
  if (workoutsError) throw workoutsError;
  if (!workoutRows || workoutRows.length < daysPerWeek) return null;

  const workoutIds = workoutRows.map((workout) => workout.id);
  const strengthExerciseIds = (exerciseRows ?? []).filter((exercise) => exercise.kind === 'strength').map((exercise) => exercise.id);

  const { data: setLogRows, error: setLogsError } =
    strengthExerciseIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('set_logs')
          .select('workout_id, day_exercise_id, weight_kg, reps, rir')
          .in('workout_id', workoutIds)
          .in('day_exercise_id', strengthExerciseIds);
  if (setLogsError) throw setLogsError;

  const performedAtByWorkoutId = new Map(workoutRows.map((workout) => [workout.id, workout.performed_at as string]));
  const completedDayIds = new Set(workoutRows.map((workout) => workout.program_day_id));

  const weekDays: WeekDayLog[] = dayRows.map((day) => ({
    programDayId: day.id,
    dayOrder: day.day_order,
    completed: completedDayIds.has(day.id),
  }));

  // Group this week's set_logs into one session per (exercise, workout).
  const sessionsByExercise = new Map<string, Map<string, WeekSessionLog>>();
  for (const row of setLogRows ?? []) {
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

  const strengthExerciseRows = (exerciseRows ?? []).filter((exercise) => exercise.kind === 'strength');

  const weekExercises: WeekExerciseLog[] = strengthExerciseRows.map((exercise) => ({
    dayExerciseId: exercise.id,
    muscleGroup: exercise.muscle_group ?? 'Onbekend',
    exerciseType: (exercise.exercise_type as 'compound' | 'isolation') ?? 'compound',
    currentSets: exercise.sets ?? 0,
    repRangeMin: exercise.rep_range_min ?? 0,
    repRangeMax: exercise.rep_range_max ?? 0,
    targetRIR: exercise.target_rir ?? 1,
    sessions: [...(sessionsByExercise.get(exercise.id)?.values() ?? [])],
  }));

  const weekLog: WeekLog = { weekNumber: programRow.current_week_number, days: weekDays, exercises: weekExercises };

  // Reconstruct RecentWeekSummary[] for every week strictly before this one from the program_adjustments log.
  const { data: adjustmentRows, error: adjustmentsError } = await supabase
    .from('program_adjustments')
    .select('week_number, is_deload, adjustment_type')
    .eq('program_id', programRow.id)
    .lt('week_number', programRow.current_week_number);
  if (adjustmentsError) throw adjustmentsError;

  const recentWeeks: RecentWeekSummary[] = [];
  for (let weekNumber = 1; weekNumber < programRow.current_week_number; weekNumber++) {
    const rowsForWeek = (adjustmentRows ?? []).filter((row) => row.week_number === weekNumber);
    recentWeeks.push({
      weekNumber,
      wasDeload: rowsForWeek.some((row) => row.is_deload),
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
          exerciseType: (exercise.exercise_type as 'compound' | 'isolation') ?? 'compound',
          sets: exercise.sets ?? 0,
        })),
    })),
  };

  const goal = programRow.goal as Goal;
  const adjustments = evaluateWeek(weekLog, program, goal);

  const exerciseNamesById = new Map((exerciseRows ?? []).map((exercise) => [exercise.id, exercise.exercise_name as string]));
  const dayNamesById = new Map(dayRows.map((day) => [day.id, day.name as string]));

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
      const { error } = await supabase.from('day_exercises').update({ sets: exercise.sets }).eq('id', exercise.dayExerciseId);
      if (error) throw error;
    }
  }

  const activeDayIds = new Set(nextProgram.days.map((day) => day.programDayId));
  const deactivatedDayIds = review.program.days.map((day) => day.programDayId).filter((id) => !activeDayIds.has(id));
  if (deactivatedDayIds.length > 0) {
    const { error } = await supabase.from('program_days').update({ is_active: false }).in('id', deactivatedDayIds);
    if (error) throw error;
  }

  if (adjustments.length > 0) {
    const { error } = await supabase.from('program_adjustments').insert(
      adjustments.map((adjustment) => ({
        program_id: review.programId,
        day_exercise_id: adjustment.dayExerciseId ?? null,
        adjustment_type: adjustment.type,
        previous_value: adjustment.previousValue ?? null,
        new_value: adjustment.newValue ?? null,
        reason: adjustment.explanation,
        week_number: review.weekNumber,
        is_deload: adjustment.type === 'deload',
      })),
    );
    if (error) throw error;
  }

  const { error: programUpdateError } = await supabase
    .from('programs')
    .update({ current_week_number: review.weekNumber + 1 })
    .eq('id', review.programId);
  if (programUpdateError) throw programUpdateError;

  // Adjustments only ever change what's scheduled from tomorrow onward — a
  // day that's already passed (or is today) keeps whatever was actually
  // planned for it, never retroactively. Clearing just the strictly-future
  // planned/rest rows lets `ensureScheduledWindow` regenerate them the next
  // time it runs, against the now-updated program (fewer active days,
  // different set counts, etc.) instead of the stale plan from before.
  const { error: clearScheduleError } = await supabase
    .from('scheduled_sessions')
    .delete()
    .eq('program_id', review.programId)
    .in('status', ['planned', 'rest'])
    .gt('scheduled_date', todayLocalDateString());
  if (clearScheduleError) throw clearScheduleError;
}
