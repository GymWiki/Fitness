import { assertProgressionRules, defaultProgressionRuleFor } from './programs';
import { supabase } from '@/lib/supabase/singleton';

export interface SchemaExercise {
  id: string;
  exerciseOrder: number;
  exerciseName: string;
  muscleGroup: string | null;
  kind: 'strength' | 'cardio_duration' | 'cardio_interval';
  sets: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  targetRIR: number | null;
}

export interface SchemaDay {
  id: string;
  dayOrder: number;
  name: string;
  isActive: boolean;
  exercises: SchemaExercise[];
}

export interface SchemaProgram {
  id: string;
  name: string;
  days: SchemaDay[];
}

/**
 * The active program with ALL its days (active and inactive), for the
 * Schema tab. Unlike `fetchActiveProgram` this is not offline-cached: schema
 * edits need to start from the freshest state, and this screen is an
 * online-only editing surface (like week-review/onboarding), not part of the
 * offline workout-logging path.
 */
export async function fetchSchemaProgram(userId: string): Promise<SchemaProgram | null> {
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
    .select(
      'id, day_order, name, is_active, day_exercises (id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir)',
    )
    .eq('program_id', programRow.id)
    .order('day_order', { ascending: true });
  if (daysError) throw daysError;

  const days: SchemaDay[] = (dayRows ?? []).map((day) => ({
    id: day.id,
    dayOrder: day.day_order,
    name: day.name,
    isActive: day.is_active,
    exercises: [...(day.day_exercises ?? [])]
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .map((exercise) => ({
        id: exercise.id,
        exerciseOrder: exercise.exercise_order,
        exerciseName: exercise.exercise_name,
        muscleGroup: exercise.muscle_group,
        kind: exercise.kind,
        sets: exercise.sets,
        repRangeMin: exercise.rep_range_min,
        repRangeMax: exercise.rep_range_max,
        targetRIR: exercise.target_rir,
      })),
  }));

  return { id: programRow.id, name: programRow.name, days };
}

export interface ExerciseSetsUpdate {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
}

export async function updateExerciseSets(dayExerciseId: string, update: ExerciseSetsUpdate): Promise<void> {
  const { error } = await supabase
    .from('day_exercises')
    .update({
      sets: update.sets,
      rep_range_min: update.repRangeMin,
      rep_range_max: update.repRangeMax,
      target_rir: update.targetRIR,
    })
    .eq('id', dayExerciseId);
  if (error) throw error;
}

export async function replaceExercise(dayExerciseId: string, newExerciseName: string): Promise<void> {
  const { error } = await supabase.from('day_exercises').update({ exercise_name: newExerciseName }).eq('id', dayExerciseId);
  if (error) throw error;
}

/** Swaps exercise_order between two exercises in the same day — the "move up/down" action. */
export async function swapExerciseOrder(a: { id: string; exerciseOrder: number }, b: { id: string; exerciseOrder: number }): Promise<void> {
  const { error: errorA } = await supabase.from('day_exercises').update({ exercise_order: b.exerciseOrder }).eq('id', a.id);
  if (errorA) throw errorA;
  const { error: errorB } = await supabase.from('day_exercises').update({ exercise_order: a.exerciseOrder }).eq('id', b.id);
  if (errorB) throw errorB;
}

/**
 * Soft-deletes a day by deactivating it — the same mechanism the weekly
 * adaptation planner uses to shrink a schedule, so history (workouts,
 * set_logs) is never lost and the planner keeps working on what remains.
 */
export async function removeDay(dayId: string): Promise<void> {
  const { error } = await supabase.from('program_days').update({ is_active: false }).eq('id', dayId);
  if (error) throw error;
}

export interface NewExerciseInput {
  exerciseName: string;
  muscleGroup: string;
  exerciseType: 'compound' | 'isolation';
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
  weightIncrementKg: number;
}

/**
 * Appends a new strength exercise to the end of a day — permanently, since
 * it's a real `day_exercises` row: the next time this day's slot comes
 * around in the rotation (e.g. the next "Pull A"), the exercise is still
 * there. `nextExerciseOrder` is the day's current exercise count (the new
 * row goes right after the last one).
 */
export async function addExercise(dayId: string, nextExerciseOrder: number, exercise: NewExerciseInput): Promise<void> {
  const row = {
    program_day_id: dayId,
    exercise_order: nextExerciseOrder,
    exercise_name: exercise.exerciseName,
    muscle_group: exercise.muscleGroup,
    exercise_type: exercise.exerciseType,
    kind: 'strength' as const,
    sets: exercise.sets,
    rep_range_min: exercise.repRangeMin,
    rep_range_max: exercise.repRangeMax,
    target_rir: exercise.targetRIR,
    progression_rule: defaultProgressionRuleFor({ kind: 'strength', weightIncrementKg: exercise.weightIncrementKg }),
  };
  assertProgressionRules([row]);
  const { error } = await supabase.from('day_exercises').insert(row);
  if (error) throw error;
}
