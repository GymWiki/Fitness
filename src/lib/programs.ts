import type { CardioSessionType, GeneratedProgram, IntakeAnswers } from '@fitness/program-generator';
import type { Gender } from './profile';
import type { Physique } from './physique';
import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

const CARDIO_KIND_BY_SESSION_TYPE: Record<CardioSessionType, 'cardio_duration' | 'cardio_interval'> = {
  zone2: 'cardio_duration',
  interval: 'cardio_interval',
};

/**
 * The single place that computes a `day_exercises.progression_rule` value —
 * every insert path must call this for every row. `progression_rule` is
 * NOT NULL in the DB, and Postgres/PostgREST bulk inserts do NOT fall back
 * to the column default for a key that's simply absent from one object in a
 * batch: if any row in the same `.insert([...])` array is missing a key that
 * another row has, the missing rows get an explicit NULL for that column,
 * not the default — so a mixed batch (e.g. strength rows that set
 * `progression_rule` alongside cardio rows that don't) trips the NOT NULL
 * constraint even though the column has `default '{}'::jsonb`. Routing every
 * row through this helper is what prevents that class of bug for good.
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
 * Defensive check run right before every `day_exercises` insert: turns a raw
 * Postgres 23502 (not-null violation) into a clear, immediately-diagnosable
 * application error instead of letting the constraint failure bubble up
 * un-explained.
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
 * day_exercises) and returns the new program's id. Shared by onboarding
 * (`saveGeneratedProgram`) and switching goals (`switchGoal.ts`) — the two
 * places a brand new program gets created — so they can never drift apart.
 */
export async function insertProgramStructure(userId: string, program: GeneratedProgram): Promise<string> {
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
        cardio_config: { durationMinutes: session.durationMinutes },
        progression_rule: defaultProgressionRuleFor({ kind, sessionType: session.sessionType }),
      };
    });
    return [...strengthRows, ...cardioRows];
  });

  assertProgressionRules(exerciseRows);
  const { error: exercisesError } = await supabase.from('day_exercises').insert(exerciseRows);
  if (exercisesError) throw exercisesError;

  return programRow.id as string;
}

/** Persists an intake + its generated program: profile upsert, then insertProgramStructure. */
export async function saveGeneratedProgram(
  userId: string,
  intake: IntakeAnswers,
  program: GeneratedProgram,
  profileExtras: OnboardingProfileExtras,
): Promise<void> {
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    goal: intake.goal,
    experience_level: intake.experienceLevel,
    days_per_week: intake.daysPerWeek,
    equipment: intake.equipment,
    display_name: profileExtras.displayName ?? null,
    target_physique: profileExtras.targetPhysique,
    gender: profileExtras.gender ?? null,
    birth_year: profileExtras.birthYear ?? null,
    target_weight_kg: profileExtras.targetWeightKg ?? null,
    preferred_weekdays: profileExtras.preferredWeekdays,
  });
  if (profileError) throw profileError;

  await insertProgramStructure(userId, program);
}

export interface ProgramHistoryEntry {
  id: string;
  name: string;
  goal: GeneratedProgram['goal'];
  status: 'active' | 'completed' | 'archived';
  startedAt: string;
}

/** Every program the user has ever had (active + archived), newest first — the "reis" overview in Profiel. */
export async function fetchProgramHistory(userId: string): Promise<ProgramHistoryEntry[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, goal, status, started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    goal: row.goal,
    status: row.status,
    startedAt: row.started_at,
  }));
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

/**
 * A single program day with its exercises, for the workout-entry screen. RLS
 * scopes this to the owning user. Cached so a day you've already opened once
 * can still be loaded — and logged against — without a connection.
 */
export async function fetchProgramDayWithExercises(dayId: string): Promise<ProgramDayForWorkout | null> {
  return fetchWithCache(`program_day:${dayId}`, () => fetchProgramDayWithExercisesFromNetwork(dayId));
}

async function fetchProgramDayWithExercisesFromNetwork(dayId: string): Promise<ProgramDayForWorkout | null> {
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

/**
 * The most recently started active program for a user, with its days and
 * exercises, or null if none exists yet. Cached so "Vandaag" still shows
 * the program (with a possibly-stale `nextDayOrder`) when opened offline.
 */
export async function fetchActiveProgram(userId: string): Promise<ActiveProgram | null> {
  return fetchWithCache(`active_program:${userId}`, () => fetchActiveProgramFromNetwork(userId));
}

async function fetchActiveProgramFromNetwork(userId: string): Promise<ActiveProgram | null> {
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
    .select('id, day_order, name, day_exercises (id, exercise_order, exercise_name, muscle_group, kind, sets, rep_range_min, rep_range_max, target_rir)')
    .eq('program_id', programRow.id)
    .eq('is_active', true)
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
        kind: exercise.kind,
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
