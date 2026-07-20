/** Shared domain types for the program generator. Framework-agnostic, no I/O. */

export type Goal = 'hypertrophy' | 'strength' | 'endurance' | 'fat_loss' | 'mixed';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type EquipmentType = 'gym' | 'home_dumbbells' | 'bodyweight';

export type ExerciseType = 'compound' | 'isolation';

export type TemplateKey = 'full_body_3x' | 'upper_lower_4x';

export interface IntakeAnswers {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  /** 2-6, validated by the caller against the same range as the `profiles` table check constraint. */
  daysPerWeek: number;
  equipment: EquipmentType;
}

export interface GeneratedExercise {
  exerciseOrder: number;
  exerciseName: string;
  muscleGroup: string;
  exerciseType: ExerciseType;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
  /** Smallest plate/dumbbell increment to prescribe for this exercise, in kg. */
  weightIncrementKg: number;
}

export interface GeneratedDay {
  dayOrder: number;
  name: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedProgram {
  templateKey: TemplateKey;
  name: string;
  goal: Goal;
  days: GeneratedDay[];
}
