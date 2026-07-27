import type { CardioSessionType, GeneratedProgram, IntakeAnswers } from '@fitness/program-generator';
import type { Gender } from './profile';
import type { Physique } from './physique';
import { getAllAsync, getFirstAsync, runAsync, withTransactionAsync } from './db';
import { generateId } from './id';

const CARDIO_KIND_BY_SESSION_TYPE: Record<CardioSessionType, 'cardio_duration' | 'cardio_interval'> = {
  zone2: 'cardio_duration',
  interval: 'cardio_interval',
};

/**
 * The single place that computes a `day_exercises.progression_rule` value —
 * every insert path must call this for every row. The column is NOT NULL, so
 * every row (strength or cardio) needs an explicit value rather than relying
 * on a default.
 */
export function defaultProgressionRuleFor(
  exercise:
    | { kind: 'strength'; weightIncrementKg: number }
    | { kind: 'cardio_duration' | 'cardio_interval'; sessionType: CardioSessionType },
): Record<string, unknown> {
  if (exercise.kind === 'strength') {
    return { weightIncrementKg: exercise.weightIncrementKg };
  }
  return { type: 'polarized', sessionType: exercise.sessionType };
}

/**
 * Defensive check run right before every `day_exercises` insert: turns a
 * missing `progression_rule` into a clear, immediately-diagnosable
 * application error instead of a raw NOT NULL constraint failure.
 */
export function assertProgressionRules(rows: Array<{ exercise_name: string; progression_rule?: unknown }>): void {
  const missing = rows.find((row) => row.progression_rule === null || row.progression_rule === undefined);
  if (missing) {
    throw new Error(
      `Interne fout: oefening "${missing.exercise_name}" heeft geen progression_rule en kan niet worden opgeslagen.`,
    );
  }
}

export interface OnboardingProfileExtras {
  displayName?: string | null;
  targetPhysique: Physique;
  gender?: Gender | null;
  birthYear?: number | null;
  targetWeightKg?: number | null;
  /** 1 (Monday) .. 7 (Sunday), length equal to `intake.daysPerWeek`. */
  preferredWeekdays: number[];
}

/**
 * Inserts a generated program's full structure (program -> program_days ->
 * day_exercises) in a single SQLite transaction and returns the new
 * program's id. Shared by onboarding (`saveGeneratedProgram`) and switching
 * goals (`switchGoal.ts`) — the two places a brand new program gets created —
 * so they can never drift apart.
 */
export async function insertProgramStructure(program: GeneratedProgram): Promise<string> {
  const programId = generateId();
  const now = new Date().toISOString();

  await withTransactionAsync(async () => {
    await runAsync(
      `insert into programs (id, name, goal, status, template_key, started_at, current_week_number, created_at, updated_at)
       values (?, ?, ?, 'active', ?, ?, 1, ?, ?)`,
      [programId, program.name, program.goal, program.templateKey, now.slice(0, 10), now, now],
    );

    const programDayIdByOrder = new Map<number, string>();
    for (const day of program.days) {
      const dayId = generateId();
      programDayIdByOrder.set(day.dayOrder, dayId);
      await runAsync(
        `insert into program_days (id, program_id, day_order, name, is_active, created_at) values (?, ?, ?, ?, 1, ?)`,
        [dayId, programId, day.dayOrder, day.name, now],
      );
    }

    const exerciseRows = program.days.flatMap((day) => {
      const programDayId = programDayIdByOrder.get(day.dayOrder);
      if (!programDayId) throw new Error(`Missing inserted program_day for day_order ${day.dayOrder}`);
      const strengthRows = day.exercises.map((exercise) => ({
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
        cardio_config: null as string | null,
        progression_rule: defaultProgressionRuleFor({ kind: 'strength', weightIncrementKg: exercise.weightIncrementKg }),
      }));
      const cardioRows = day.cardioSessions.map((session) => {
        const kind = CARDIO_KIND_BY_SESSION_TYPE[session.sessionType];
        return {
          program_day_id: programDayId,
          exercise_order: session.exerciseOrder,
          exercise_name: session.exerciseName,
          muscle_group: null,
          kind,
          sets: null,
          rep_range_min: null,
          rep_range_max: null,
          target_rir: null,
          exercise_type: null,
          cardio_config: JSON.stringify({ durationMinutes: session.durationMinutes }),
          progression_rule: defaultProgressionRuleFor({ kind, sessionType: session.sessionType }),
        };
      });
      return [...strengthRows, ...cardioRows];
    });

    assertProgressionRules(exerciseRows);
    for (const row of exerciseRows) {
      await runAsync(
        `insert into day_exercises
           (id, program_day_id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir, exercise_type, cardio_config, progression_rule, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          row.exercise_type,
          row.cardio_config,
          JSON.stringify(row.progression_rule),
          now,
        ],
      );
    }
  });

  return programId;
}

/** Persists an intake + its generated program: profile upsert, then insertProgramStructure. */
export async function saveGeneratedProgram(
  intake: IntakeAnswers,
  program: GeneratedProgram,
  profileExtras: OnboardingProfileExtras,
): Promise<void> {
  const now = new Date().toISOString();
  await runAsync(
    `insert into profiles (id, goal, experience_level, days_per_week, equipment, display_name, target_physique, gender, birth_year, target_weight_kg, preferred_weekdays, created_at, updated_at)
     values ('local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict (id) do update set
       goal = excluded.goal,
       experience_level = excluded.experience_level,
       days_per_week = excluded.days_per_week,
       equipment = excluded.equipment,
       display_name = excluded.display_name,
       target_physique = excluded.target_physique,
       gender = excluded.gender,
       birth_year = excluded.birth_year,
       target_weight_kg = excluded.target_weight_kg,
       preferred_weekdays = excluded.preferred_weekdays,
       updated_at = excluded.updated_at`,
    [
      intake.goal,
      intake.experienceLevel,
      intake.daysPerWeek,
      intake.equipment,
      profileExtras.displayName ?? null,
      profileExtras.targetPhysique,
      profileExtras.gender ?? null,
      profileExtras.birthYear ?? null,
      profileExtras.targetWeightKg ?? null,
      JSON.stringify(profileExtras.preferredWeekdays),
      now,
      now,
    ],
  );

  await insertProgramStructure(program);
}

export interface ProgramHistoryEntry {
  id: string;
  name: string;
  goal: GeneratedProgram['goal'];
  status: 'active' | 'completed' | 'archived';
  startedAt: string;
}

interface ProgramHistoryRow {
  id: string;
  name: string;
  goal: GeneratedProgram['goal'];
  status: 'active' | 'completed' | 'archived';
  started_at: string;
}

/** Every program ever created (active + archived), newest first — the "reis" overview in Profiel. */
export async function fetchProgramHistory(): Promise<ProgramHistoryEntry[]> {
  const rows = await getAllAsync<ProgramHistoryRow>('select id, name, goal, status, started_at from programs order by started_at desc');
  return rows.map((row) => ({ id: row.id, name: row.name, goal: row.goal, status: row.status, startedAt: row.started_at }));
}

export interface ActiveProgramExercise {
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

interface DayExerciseRow {
  id: string;
  exercise_order: number;
  exercise_name: string;
  muscle_group: string | null;
  kind: 'strength' | 'cardio_duration' | 'cardio_interval';
  exercise_type: 'compound' | 'isolation' | null;
  sets: number | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_rir: number | null;
  progression_rule: string;
}

/** A single program day with its exercises, for the workout-entry screen. */
export async function fetchProgramDayWithExercises(dayId: string): Promise<ProgramDayForWorkout | null> {
  const day = await getFirstAsync<{ id: string; name: string }>('select id, name from program_days where id = ?', [dayId]);
  if (!day) return null;

  const exerciseRows = await getAllAsync<DayExerciseRow>(
    `select id, exercise_order, exercise_name, muscle_group, kind, exercise_type, sets, rep_range_min, rep_range_max, target_rir, progression_rule
     from day_exercises where program_day_id = ? order by exercise_order asc`,
    [dayId],
  );

  return {
    id: day.id,
    name: day.name,
    exercises: exerciseRows.map((exercise) => {
      const rule = JSON.parse(exercise.progression_rule) as { weightIncrementKg?: number };
      return {
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
        weightIncrementKg: rule.weightIncrementKg ?? 1.25,
      };
    }),
  };
}

interface ActiveProgramDayExerciseRow {
  id: string;
  program_day_id: string;
  exercise_order: number;
  exercise_name: string;
  muscle_group: string | null;
  kind: 'strength' | 'cardio_duration' | 'cardio_interval';
  sets: number | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_rir: number | null;
}

/** The most recently started active program, with its days and exercises, or null if none exists yet. */
export async function fetchActiveProgram(): Promise<ActiveProgram | null> {
  const programRow = await getFirstAsync<{ id: string; name: string }>(
    `select id, name from programs where status = 'active' order by started_at desc limit 1`,
  );
  if (!programRow) return null;

  const dayRows = await getAllAsync<{ id: string; day_order: number; name: string }>(
    `select id, day_order, name from program_days where program_id = ? and is_active = 1 order by day_order asc`,
    [programRow.id],
  );

  const dayIds = dayRows.map((day) => day.id);
  const exerciseRows =
    dayIds.length === 0
      ? []
      : await getAllAsync<ActiveProgramDayExerciseRow>(
          `select id, program_day_id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir
           from day_exercises where program_day_id in (${dayIds.map(() => '?').join(',')}) order by exercise_order asc`,
          dayIds,
        );

  const days: ActiveProgramDay[] = dayRows.map((day) => ({
    id: day.id,
    dayOrder: day.day_order,
    name: day.name,
    exercises: exerciseRows
      .filter((exercise) => exercise.program_day_id === day.id)
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

  let workoutCount = 0;
  if (dayIds.length > 0) {
    const countRow = await getFirstAsync<{ count: number }>(
      `select count(*) as count from workouts where program_day_id in (${dayIds.map(() => '?').join(',')})`,
      dayIds,
    );
    workoutCount = countRow?.count ?? 0;
  }

  const nextDayOrder = days.length === 0 ? 1 : (workoutCount % days.length) + 1;

  return { id: programRow.id, name: programRow.name, days, nextDayOrder };
}
