/** Shared domain types for the adaptation planner. Framework-agnostic, no I/O. */

export type Goal = 'hypertrophy' | 'strength' | 'endurance' | 'fat_loss' | 'mixed';

export type ExerciseType = 'compound' | 'isolation';

// ---------- Week input ----------

export interface WeekSetLog {
  weightKg: number;
  reps: number;
  rir: number;
}

export interface WeekSessionLog {
  /** ISO date string. */
  date: string;
  sets: WeekSetLog[];
}

export interface WeekExerciseLog {
  dayExerciseId: string;
  muscleGroup: string;
  exerciseType: ExerciseType;
  /** Sets currently prescribed for this exercise, before this week's evaluation. */
  currentSets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
  /** Sessions logged this week for this exercise (usually 0 or 1 given a weekly training cadence). */
  sessions: WeekSessionLog[];
}

export interface WeekDayLog {
  programDayId: string;
  dayOrder: number;
  /** Whether a workout was logged against this program day during the week. */
  completed: boolean;
}

export interface RecentWeekSummary {
  weekNumber: number;
  wasDeload: boolean;
  /** True if that week showed a recovery red flag (reps falling below the target range). */
  hasRecoverySignal: boolean;
}

export interface WeekLog {
  weekNumber: number;
  days: WeekDayLog[];
  exercises: WeekExerciseLog[];
}

// ---------- Program state (mutated by applyAdjustments) ----------

export interface ProgramExerciseState {
  dayExerciseId: string;
  muscleGroup: string;
  exerciseType: ExerciseType;
  sets: number;
}

export interface ProgramDayState {
  programDayId: string;
  dayOrder: number;
  exercises: ProgramExerciseState[];
}

export interface CurrentProgramState {
  daysPerWeek: number;
  days: ProgramDayState[];
  /** Week history strictly before the week being evaluated, oldest first — feeds shouldDeload. */
  recentWeeks: RecentWeekSummary[];
  /** Whether the upcoming week is (already) flagged as a deload week. */
  isDeloadWeek: boolean;
}

// ---------- Adjustments ----------

export type AdjustmentType = 'volume_increase' | 'volume_decrease' | 'deload' | 'reduce_days';

export interface Adjustment {
  type: AdjustmentType;
  /** Muscle group this targets, for volume_increase/volume_decrease. */
  muscleGroup?: string;
  /** Which exercise to mutate, for volume_increase/volume_decrease. */
  dayExerciseId?: string;
  previousValue?: number;
  newValue?: number;
  /** User-facing explanation (Dutch), always present. */
  reason: string;
}

export interface DeloadDecision {
  shouldDeload: boolean;
  reason: string;
}

// ---------- Session distribution ----------

export interface StrengthDayInput {
  id: string;
  name: string;
  /** True for a day that trains lower body with compound lifts at high intensity — cardio must not land the day before this. */
  isHeavyLowerBody: boolean;
}

export interface CardioSessionInput {
  id: string;
  intensity: 'low' | 'high';
}

/** 1 = Monday ... 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WeekPlanEntry {
  weekday: Weekday;
  strengthDayId?: string;
  cardioSessionId?: string;
}
