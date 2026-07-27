import { calculateNutritionTargets, type NutritionTargets } from '@fitness/nutrition-engine';
import type { BodyMeasurement } from './measurements';
import type { Profile } from './profile';

/**
 * Wraps the pure `calculateNutritionTargets` with the app's actual profile +
 * latest body measurement. Returns `null` when there isn't enough data yet
 * (no measurement logged, or gender/birth year missing from onboarding) —
 * the UI prompts the user to fill that in rather than showing a guess.
 * Age is estimated from birth year only (no month/day precision), the same
 * rough-estimate level the rest of the app already uses for body metrics.
 */
export function computeUserNutritionTargets(profile: Profile, latestMeasurement: BodyMeasurement | null): NutritionTargets | null {
  if (!latestMeasurement || !profile.gender || !profile.birthYear) return null;

  const age = new Date().getFullYear() - profile.birthYear;
  if (age <= 0) return null;

  return calculateNutritionTargets({
    weightKg: latestMeasurement.weightKg,
    heightCm: latestMeasurement.heightCm,
    gender: profile.gender,
    age,
    daysPerWeek: profile.daysPerWeek,
    goal: profile.goal,
  });
}
