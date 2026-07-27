/**
 * Shared domain types for the nutrition engine. Framework-agnostic, no I/O.
 *
 * `NutritionGoal` deliberately mirrors `@fitness/program-generator`'s `Goal`
 * union by value rather than importing it — packages in this monorepo are
 * intentionally not cross-dependent (see PROJECT.md), so the app layer is
 * responsible for passing the right string through.
 */
export type NutritionGoal = 'hypertrophy' | 'strength' | 'endurance' | 'fat_loss' | 'mixed';

export type NutritionGender = 'male' | 'female' | 'other';

export interface NutritionProfileInput {
  weightKg: number;
  heightCm: number;
  gender: NutritionGender;
  /** Whole years. */
  age: number;
  /** 2-6, same range as the training-days-per-week field elsewhere in the app — used as an activity-level proxy. */
  daysPerWeek: number;
  goal: NutritionGoal;
}

export interface NutritionTargetOverrides {
  /** Overrides the goal's default protein g/kg bodyweight. */
  proteinPerKgOverride?: number;
  /** Overrides the default 25% of calories from fat (0-1). */
  fatPercentOverride?: number;
}

export interface NutritionTargets {
  /** Basal metabolic rate, kcal/day (Mifflin-St Jeor). */
  bmr: number;
  /** Total daily energy expenditure, kcal/day (bmr x activity multiplier). */
  tdee: number;
  /** Daily calorie target, kcal/day (tdee adjusted for the goal's surplus/deficit). */
  calories: number;
  proteinGrams: number;
  /** The g/kg bodyweight figure actually used (goal default or override). */
  proteinPerKg: number;
  fatGrams: number;
  carbGrams: number;
}

export interface DailyProteinTotal {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  proteinGrams: number;
}
