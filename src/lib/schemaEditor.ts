import { assertProgressionRules } from './programs';
import { getAllAsync, getFirstAsync, runAsync } from './db';
import { generateId } from './id';

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

/** The active program with ALL its days (active and inactive), for the Schema tab. */
export async function fetchSchemaProgram(): Promise<SchemaProgram | null> {
  const programRow = await getFirstAsync<{ id: string; name: string }>(
    `select id, name from programs where status = 'active' order by started_at desc limit 1`,
  );
  if (!programRow) return null;

  const dayRows = await getAllAsync<{ id: string; day_order: number; name: string; is_active: number }>(
    'select id, day_order, name, is_active from program_days where program_id = ? order by day_order asc',
    [programRow.id],
  );

  const days: SchemaDay[] = [];
  for (const day of dayRows) {
    const exerciseRows = await getAllAsync<{
      id: string;
      exercise_order: number;
      exercise_name: string;
      muscle_group: string | null;
      kind: 'strength' | 'cardio_duration' | 'cardio_interval';
      sets: number | null;
      rep_range_min: number | null;
      rep_range_max: number | null;
      target_rir: number | null;
    }>(
      'select id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir from day_exercises where program_day_id = ? order by exercise_order asc',
      [day.id],
    );
    days.push({
      id: day.id,
      dayOrder: day.day_order,
      name: day.name,
      isActive: day.is_active === 1,
      exercises: exerciseRows.map((exercise) => ({
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
    });
  }

  return { id: programRow.id, name: programRow.name, days };
}

export interface ExerciseSetsUpdate {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
}

export async function updateExerciseSets(dayExerciseId: string, update: ExerciseSetsUpdate): Promise<void> {
  await runAsync('update day_exercises set sets = ?, rep_range_min = ?, rep_range_max = ?, target_rir = ? where id = ?', [
    update.sets,
    update.repRangeMin,
    update.repRangeMax,
    update.targetRIR,
    dayExerciseId,
  ]);
}

export async function replaceExercise(dayExerciseId: string, newExerciseName: string): Promise<void> {
  await runAsync('update day_exercises set exercise_name = ? where id = ?', [newExerciseName, dayExerciseId]);
}

/** Swaps exercise_order between two exercises in the same day — the "move up/down" action. */
export async function swapExerciseOrder(a: { id: string; exerciseOrder: number }, b: { id: string; exerciseOrder: number }): Promise<void> {
  await runAsync('update day_exercises set exercise_order = ? where id = ?', [b.exerciseOrder, a.id]);
  await runAsync('update day_exercises set exercise_order = ? where id = ?', [a.exerciseOrder, b.id]);
}

/**
 * Soft-deletes a day by deactivating it — the same mechanism the weekly
 * adaptation planner uses to shrink a schedule, so history (workouts,
 * set_logs) is never lost and the planner keeps working on what remains.
 */
export async function removeDay(dayId: string): Promise<void> {
  await runAsync('update program_days set is_active = 0 where id = ?', [dayId]);
}

/**
 * Adds a day back to the schedule. Prefers reactivating the lowest-order
 * previously-removed day (the exact inverse of `removeDay`, so its exercise
 * history is still there); only creates a brand new day + a copy of the
 * given template day's exercises if there's nothing to reactivate.
 */
export async function addDay(program: SchemaProgram, templateDayId: string): Promise<void> {
  const inactiveDays = program.days.filter((day) => !day.isActive).sort((a, b) => a.dayOrder - b.dayOrder);
  if (inactiveDays.length > 0) {
    await runAsync('update program_days set is_active = 1 where id = ?', [inactiveDays[0]!.id]);
    return;
  }

  const templateDay = program.days.find((day) => day.id === templateDayId);
  if (!templateDay) throw new Error('Template day not found');

  const nextDayOrder = Math.max(...program.days.map((day) => day.dayOrder)) + 1;
  const newDayId = generateId();
  const now = new Date().toISOString();
  await runAsync('insert into program_days (id, program_id, day_order, name, is_active, created_at) values (?, ?, ?, ?, 1, ?)', [
    newDayId,
    program.id,
    nextDayOrder,
    `Nieuwe dag (kopie van ${templateDay.name})`,
    now,
  ]);

  const exerciseRows = templateDay.exercises.map((exercise) => ({
    program_day_id: newDayId,
    exercise_order: exercise.exerciseOrder,
    exercise_name: exercise.exerciseName,
    muscle_group: exercise.muscleGroup,
    kind: exercise.kind,
    sets: exercise.sets,
    rep_range_min: exercise.repRangeMin,
    rep_range_max: exercise.repRangeMax,
    target_rir: exercise.targetRIR,
    // The template day's own progression_rule isn't carried in SchemaExercise, so this
    // is a fresh default rather than a copy — matches the schema default '{}', set
    // explicitly (not omitted) so it's never missing.
    progression_rule: {},
  }));
  assertProgressionRules(exerciseRows);
  for (const row of exerciseRows) {
    await runAsync(
      `insert into day_exercises (id, program_day_id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir, progression_rule, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        row.program_day_id,
        row.exercise_order,
        row.exercise_name,
        row.muscle_group,
        row.kind,
        row.sets,
        row.rep_range_min,
        row.rep_range_max,
        row.target_rir,
        JSON.stringify(row.progression_rule),
        now,
      ],
    );
  }
}
