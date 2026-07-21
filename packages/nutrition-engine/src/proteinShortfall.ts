import type { DailyProteinTotal } from './types';

export const DEFAULT_SHORTFALL_CONSECUTIVE_DAYS = 3;

/**
 * True only when the most recent `consecutiveDaysThreshold` logged days are
 * *all* below the protein target — a single off day (missed a meal, forgot
 * to log) never trips it, only a genuine streak does. Deliberately looks
 * only at the tail of the series (most recent days), not the whole history,
 * so an old shortfall that's since been corrected doesn't keep firing.
 * `dailyTotals` must be sorted oldest-first (same order `fetchWithCache`
 * read layers already return history in elsewhere in this app).
 */
export function detectProteinShortfall(
  dailyTotals: DailyProteinTotal[],
  targetProteinGrams: number,
  consecutiveDaysThreshold: number = DEFAULT_SHORTFALL_CONSECUTIVE_DAYS,
): boolean {
  if (dailyTotals.length < consecutiveDaysThreshold) return false;
  const recentDays = dailyTotals.slice(-consecutiveDaysThreshold);
  return recentDays.every((day) => day.proteinGrams < targetProteinGrams);
}
