import { detectProteinShortfall } from '@fitness/nutrition-engine';
import { fetchRecentDailyProteinTotals } from './foodLogs';
import type { BodyMeasurement } from './measurements';
import { computeUserNutritionTargets } from './nutritionTargets';
import type { Profile } from './profile';

/**
 * "Opbouwfase" (a building phase) is interpreted as hypertrophy/strength —
 * the goals where consistent protein intake most directly supports the
 * training stimulus. fat_loss/endurance/mixed don't get this signal: it
 * would either be noise (protein is already prioritized there per the
 * per-goal targets) or not the primary lever for those goals.
 */
const GOALS_WITH_SHORTFALL_SIGNAL: ReadonlySet<Profile['goal']> = new Set(['hypertrophy', 'strength']);

/**
 * True when protein intake has structurally lagged the target during a
 * building phase — wired into the same explanation-banner pattern as the
 * supercompensation indicator on "Vandaag". Fails soft to `false` (never
 * throws) so a nutrition-data hiccup can't take down the training banner
 * it sits alongside.
 */
export async function checkProteinShortfall(userId: string, profile: Profile, latestMeasurement: BodyMeasurement | null): Promise<boolean> {
  if (!GOALS_WITH_SHORTFALL_SIGNAL.has(profile.goal)) return false;
  const targets = computeUserNutritionTargets(profile, latestMeasurement);
  if (!targets) return false;
  try {
    const dailyTotals = await fetchRecentDailyProteinTotals(userId);
    return detectProteinShortfall(dailyTotals, targets.proteinGrams);
  } catch {
    return false;
  }
}
