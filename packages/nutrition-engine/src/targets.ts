import type { NutritionGoal, NutritionProfileInput, NutritionTargetOverrides, NutritionTargets } from './types';

/**
 * Calorie adjustment applied to TDEE per goal — the single place that
 * encodes "hypertrophy trains in a light surplus, fat_loss in a deficit,
 * everything else near maintenance." Tune here, not in the UI.
 */
export const CALORIE_ADJUSTMENT_BY_GOAL: Record<NutritionGoal, number> = {
  hypertrophy: 1.1,
  strength: 1.0,
  endurance: 1.0,
  fat_loss: 0.8,
  mixed: 1.0,
};

/**
 * Protein target in g/kg bodyweight per goal. Hypertrophy/strength sit at a
 * middle-of-the-road value within the well-supported 1.6-2.2 g/kg range for
 * resistance training; fat_loss leans toward the high end specifically to
 * protect muscle mass in a deficit; endurance/mixed use a more moderate,
 * balanced figure. Adjustable per call via `proteinPerKgOverride`.
 */
export const PROTEIN_G_PER_KG_BY_GOAL: Record<NutritionGoal, number> = {
  hypertrophy: 1.9,
  strength: 1.9,
  fat_loss: 2.0,
  endurance: 1.6,
  mixed: 1.6,
};

/** Default share of calories from fat when no override is given — enough for hormonal health without crowding out protein/carbs. */
export const DEFAULT_FAT_PERCENT = 0.25;

/**
 * Bucketed activity multiplier (a simplified PAL) derived from training days
 * per week — the only activity signal already collected from the user, so
 * this avoids asking a separate, easy-to-misjudge "how active are you"
 * question.
 */
export function activityMultiplierForDaysPerWeek(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 1.375;
  if (daysPerWeek <= 4) return 1.55;
  if (daysPerWeek <= 6) return 1.725;
  return 1.9;
}

/**
 * Mifflin-St Jeor BMR. The equation is defined for male/female; `'other'`
 * uses the average of both formulas rather than excluding non-binary users
 * from a target altogether — an explicit, documented approximation (see
 * PROJECT.md), not a precise clinical figure either way.
 */
function calculateBmr(weightKg: number, heightCm: number, age: number, gender: NutritionProfileInput['gender']): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // midpoint of +5 and -161
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Derives a daily calorie + macro target from body metrics, training
 * frequency and goal. A guideline, not medical advice — the caller is
 * responsible for surfacing that caveat in the UI.
 */
export function calculateNutritionTargets(input: NutritionProfileInput, overrides: NutritionTargetOverrides = {}): NutritionTargets {
  const bmr = calculateBmr(input.weightKg, input.heightCm, input.age, input.gender);
  const tdee = bmr * activityMultiplierForDaysPerWeek(input.daysPerWeek);
  const calories = roundTo(tdee * CALORIE_ADJUSTMENT_BY_GOAL[input.goal], 10);

  const proteinPerKg = overrides.proteinPerKgOverride ?? PROTEIN_G_PER_KG_BY_GOAL[input.goal];
  const proteinGrams = Math.round(input.weightKg * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  const fatPercent = overrides.fatPercentOverride ?? DEFAULT_FAT_PERCENT;
  const fatGrams = Math.round((calories * fatPercent) / 9);
  const fatCalories = fatGrams * 9;

  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbGrams = Math.round(carbCalories / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteinGrams,
    proteinPerKg,
    fatGrams,
    carbGrams,
  };
}
