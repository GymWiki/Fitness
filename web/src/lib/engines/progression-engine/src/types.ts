/** Shared domain types for the progression engines. Framework-agnostic, no I/O. */

export type Goal = 'hypertrophy' | 'strength' | 'endurance' | 'fat_loss' | 'mixed';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseType = 'compound' | 'isolation';

// ---------- Strength ----------

export interface StrengthExerciseConfig {
  /** Lower bound of the target rep range, inclusive. */
  repRangeMin: number;
  /** Upper bound of the target rep range, inclusive. */
  repRangeMax: number;
  /** Reps in reserve the lifter should stop at, e.g. 1-2. */
  targetRIR: number;
  exerciseType: ExerciseType;
  /** Smallest plate/dumbbell increment to round prescriptions to, in kg. Default 1.25. */
  weightIncrementKg?: number;
}

export interface StrengthSetLog {
  weightKg: number;
  reps: number;
  rir: number;
}

export interface StrengthSessionLog {
  /** ISO date string. */
  date: string;
  sets: StrengthSetLog[];
}

export type StrengthAction = 'increase_weight' | 'maintain' | 'decrease_weight';

export interface StrengthAdvice {
  action: StrengthAction;
  /** Prescribed working weight for the next session, in kg. */
  weightKg: number;
  weightChangePercent: number;
  targetReps: { min: number; max: number };
  targetRIR: number;
  /** User-facing explanation (Dutch), always present. */
  explanation: string;
}

// ---------- Cardio ----------

export type CardioSessionType = 'zone2' | 'interval';

export interface CardioLog {
  /** ISO date string. */
  date: string;
  type: CardioSessionType;
  durationMinutes: number;
  /** Rate of perceived exertion, 1-10. */
  rpe: number;
  distanceKm?: number;
  avgHeartRate?: number;
  /** Number of high-intensity rounds completed, only for interval sessions. */
  rounds?: number;
}

export interface WeeklyCardioDistribution {
  /** Size of the trailing window this was computed over. */
  windowDays: number;
  lowMinutes: number;
  highMinutes: number;
  totalMinutes: number;
  /** Share of total cardio time that was intensive (interval) within the window, 0-100. */
  intensePercent: number;
}

export interface CardioTypeAdvice {
  recommendedType: CardioSessionType;
  distribution: WeeklyCardioDistribution;
  /** Goal-dependent target share of zone2 time within the window, 0-100. */
  targetZone2Percent: number;
  explanation: string;
}

export type CardioProgressionAction = 'increase_duration' | 'maintain' | 'deload';

export interface Zone2Advice {
  action: CardioProgressionAction;
  durationMinutes: number;
  durationChangePercent: number;
  explanation: string;
}

export type IntervalProgressionAction = 'increase_rounds' | 'increase_tempo' | 'maintain';

export interface IntervalAdvice {
  action: IntervalProgressionAction;
  rounds: number;
  tempoLevel: number;
  explanation: string;
}
