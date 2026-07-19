import type { GeneratedProgram, IntakeAnswers } from '@fitness/program-generator';
import { supabase } from './supabase';

/** Persists an intake + its generated program: profile upsert, then program -> program_days -> day_exercises. */
export async function saveGeneratedProgram(
  userId: string,
  intake: IntakeAnswers,
  program: GeneratedProgram,
): Promise<void> {
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    goal: intake.goal,
    experience_level: intake.experienceLevel,
    days_per_week: intake.daysPerWeek,
    equipment: intake.equipment,
  });
  if (profileError) throw profileError;

  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .insert({ user_id: userId, name: program.name, goal: program.goal, template_key: program.templateKey })
    .select('id')
    .single();
  if (programError) throw programError;

  const { data: dayRows, error: daysError } = await supabase
    .from('program_days')
    .insert(program.days.map((day) => ({ program_id: programRow.id, day_order: day.dayOrder, name: day.name })))
    .select('id, day_order');
  if (daysError) throw daysError;

  const programDayIdByOrder = new Map(dayRows.map((row) => [row.day_order as number, row.id as string]));

  const exerciseRows = program.days.flatMap((day) => {
    const programDayId = programDayIdByOrder.get(day.dayOrder);
    if (!programDayId) throw new Error(`Missing inserted program_day for day_order ${day.dayOrder}`);
    return day.exercises.map((exercise) => ({
      program_day_id: programDayId,
      exercise_order: exercise.exerciseOrder,
      exercise_name: exercise.exerciseName,
      muscle_group: exercise.muscleGroup,
      kind: 'strength' as const,
      sets: exercise.sets,
      rep_range_min: exercise.repRangeMin,
      rep_range_max: exercise.repRangeMax,
      target_rir: exercise.targetRIR,
      exercise_type: exercise.exerciseType,
      progression_rule: { weightIncrementKg: exercise.weightIncrementKg },
    }));
  });

  const { error: exercisesError } = await supabase.from('day_exercises').insert(exerciseRows);
  if (exercisesError) throw exercisesError;
}

export interface ActiveProgramExercise {
  id: string;
  exerciseOrder: number;
  exerciseName: string;
  muscleGroup: string | null;
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetRIR: number | null;
}

export interface ActiveProgramDay {
  id: string;
  dayOrder: number;
  name: string;
  exercises: ActiveProgramExercise[];
}

export interface ActiveProgram {
  id: string;
  name: string;
  days: ActiveProgramDay[];
  /** day_order of the day that should be trained next, cycling through the program by completed-workout count. */
  nextDayOrder: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseOrder: number;
  exerciseName: string;
  muscleGroup: string | null;
  kind: 'strength' | 'cardio_duration' | 'cardio_interval';
  exerciseType: 'compound' | 'isolation' | null;
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetRIR: number | null;
  /** Smallest weight step to prescribe for this exercise, in kg. Falls back to 1.25 for older/incomplete rows. */
  weightIncrementKg: number;
}

export interface ProgramDayForWorkout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

/** A single program day with its exercises, for the workout-entry screen. RLS scopes this to the owning user. */
export async function fetchProgramDayWithExercises(dayId: string): Promise<ProgramDayForWorkout | null> {
  const { data, error } = await supabase
    .from('program_days')
    .select(
      'id, name, day_exercises (id, exercise_order, exercise_name, muscle_group, kind, exercise_type, sets, rep_range_min, rep_range_max, target_rir, progression_rule)',
    )
    .eq('id', dayId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    exercises: [...(data.day_exercises ?? [])]
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .map((exercise) => ({
        id: exercise.id,
        exerciseOrder: exercise.exercise_order,
        exerciseName: exercise.exercise_name,
        muscleGroup: exercise.muscle_group,
        kind: exercise.kind,
        exerciseType: exercise.exercise_type,
        sets: exercise.sets,
        repRangeMin: exercise.rep_range_min,
        repRangeMax: exercise.rep_range_max,
        targetRIR: exercise.target_rir,
        weightIncrementKg: (exercise.progression_rule as { weightIncrementKg?: number } | null)?.weightIncrementKg ?? 1.25,
      })),
  };
}

/** The most recently started active program for a user, with its days and exercises, or null if none exists yet. */
export async function fetchActiveProgram(userId: string): Promise<ActiveProgram | null> {
  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programError) throw programError;
  if (!programRow) return null;

  const { data: dayRows, error: daysError } = await supabase
    .from('program_days')
    .select('id, day_order, name, day_exercises (id, exercise_order, exercise_name, muscle_group, sets, rep_range_min, rep_range_max, target_rir)')
    .eq('program_id', programRow.id)
    .order('day_order', { ascending: true });
  if (daysError) throw daysError;

  const days = (dayRows ?? []).map((day) => ({
    id: day.id,
    dayOrder: day.day_order,
    name: day.name,
    exercises: [...(day.day_exercises ?? [])]
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .map((exercise) => ({
        id: exercise.id,
        exerciseOrder: exercise.exercise_order,
        exerciseName: exercise.exercise_name,
        muscleGroup: exercise.muscle_group,
        sets: exercise.sets,
        repRangeMin: exercise.rep_range_min,
        repRangeMax: exercise.rep_range_max,
        targetRIR: exercise.target_rir,
      })),
  }));

  const dayIds = days.map((day) => day.id);
  const { count: workoutCount, error: workoutsError } =
    dayIds.length === 0
      ? { count: 0, error: null }
      : await supabase.from('workouts').select('id', { count: 'exact', head: true }).in('program_day_id', dayIds);
  if (workoutsError) throw workoutsError;

  const nextDayOrder = days.length === 0 ? 1 : ((workoutCount ?? 0) % days.length) + 1;

  return { id: programRow.id, name: programRow.name, days, nextDayOrder };
}
