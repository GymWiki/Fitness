import {
  adviseCardioProgression,
  adviseNextCardioType,
  computeWeeklyDistribution,
  getStrengthAdvice,
  type CardioLog,
  type Goal,
  type IntervalAdvice,
  type StrengthAdvice,
  type StrengthExerciseConfig,
  type StrengthSessionLog,
  type Zone2Advice,
} from '@fitness/progression-engine';
import { fetchCardioHistory, fetchExerciseHistory } from './history';
import { fetchProgramDayWithExercises, type WorkoutExercise } from './programs';
import type { ScheduledSessionRow } from './schedule';

export interface StrengthPreviewExercise {
  kind: 'strength';
  exerciseName: string;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
  /** Null when the exercise has no history yet — nothing to base advice on. */
  adviceWeightKg: number | null;
  adviceExplanation: string | null;
}

export interface CardioPreviewExercise {
  kind: 'cardio';
  exerciseName: string;
  sessionType: 'zone2' | 'interval';
  durationMinutes: number;
  explanation: string;
}

export type SchedulePreviewExercise = StrengthPreviewExercise | CardioPreviewExercise;

export interface SchedulePreviewTraining {
  type: 'training';
  programDayName: string;
  exercises: SchedulePreviewExercise[];
}

export interface SchedulePreviewRest {
  type: 'rest';
}

export type SchedulePreview = SchedulePreviewTraining | SchedulePreviewRest;

async function buildStrengthPreview(userId: string, exercise: WorkoutExercise): Promise<StrengthPreviewExercise> {
  const history = await fetchExerciseHistory(userId, exercise.exerciseName).catch(() => []);
  let adviceWeightKg: number | null = null;
  let adviceExplanation: string | null = null;

  if (history.length > 0) {
    const config: StrengthExerciseConfig = {
      repRangeMin: exercise.repRangeMin ?? 0,
      repRangeMax: exercise.repRangeMax ?? 0,
      targetRIR: exercise.targetRIR ?? 1,
      exerciseType: exercise.exerciseType ?? 'compound',
      weightIncrementKg: exercise.weightIncrementKg,
    };
    const sessionHistory: StrengthSessionLog[] = history.map((session) => ({
      date: session.performedAt,
      sets: session.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, rir: set.rir })),
    }));
    const lastSession = history[history.length - 1]!;
    const currentWeightKg = Math.max(...lastSession.sets.map((set) => set.weightKg));
    const advice: StrengthAdvice = getStrengthAdvice(config, currentWeightKg, sessionHistory);
    adviceWeightKg = advice.weightKg;
    adviceExplanation = advice.explanation;
  }

  return {
    kind: 'strength',
    exerciseName: exercise.exerciseName,
    sets: exercise.sets ?? 0,
    repRangeMin: exercise.repRangeMin ?? 0,
    repRangeMax: exercise.repRangeMax ?? 0,
    targetRIR: exercise.targetRIR ?? 0,
    adviceWeightKg,
    adviceExplanation,
  };
}

async function buildCardioPreview(exercise: WorkoutExercise, goal: Goal): Promise<CardioPreviewExercise> {
  const history = await fetchCardioHistory(exercise.id).catch(() => []);
  const distribution = computeWeeklyDistribution(history as CardioLog[], 10, new Date());
  const typeAdvice = adviseNextCardioType(distribution, goal);
  const progressionAdvice: Zone2Advice | IntervalAdvice =
    typeAdvice.recommendedType === 'zone2'
      ? adviseCardioProgression(history as CardioLog[], 'zone2', goal)
      : adviseCardioProgression(history as CardioLog[], 'interval', goal);
  const durationMinutes =
    typeAdvice.recommendedType === 'zone2'
      ? (progressionAdvice as Zone2Advice).durationMinutes
      : (progressionAdvice as IntervalAdvice).rounds * 7; // same rough 7 min/round estimate the workout screen uses

  return {
    kind: 'cardio',
    exerciseName: exercise.exerciseName,
    sessionType: typeAdvice.recommendedType,
    durationMinutes,
    explanation: `${typeAdvice.explanation} ${progressionAdvice.explanation}`,
  };
}

/**
 * Read-only preview of a scheduled day for the inline info section below
 * the Schema page's week-card row — reuses the same data layer and
 * progression-engine calls the workout screen uses
 * (`fetchProgramDayWithExercises`, `getStrengthAdvice`,
 * `computeWeeklyDistribution`/`adviseNextCardioType`/
 * `adviseCardioProgression`), just for every exercise on the day at once
 * instead of one at a time. Returns `null` when the scheduled program day
 * no longer exists (e.g. removed from the schema after this day was
 * scheduled) — the caller shows a load error rather than mislabeling it as
 * a rest day.
 */
export async function fetchSchedulePreview(userId: string, row: ScheduledSessionRow, goal: Goal): Promise<SchedulePreview | null> {
  if (!row.programDayId) return { type: 'rest' };

  const day = await fetchProgramDayWithExercises(row.programDayId);
  if (!day) return null;

  const exercises = await Promise.all(
    day.exercises.map((exercise) => (exercise.kind === 'strength' ? buildStrengthPreview(userId, exercise) : buildCardioPreview(exercise, goal))),
  );

  return { type: 'training', programDayName: day.name, exercises };
}
