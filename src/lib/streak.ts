import { addDays, isSameLocalDay, startOfIsoWeek } from './dateWeek';

function distinctTrainingDaysInWeek(workoutDates: Date[], weekStart: Date): number {
  const daysInWeek = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  return daysInWeek.filter((day) => workoutDates.some((workoutDate) => isSameLocalDay(workoutDate, day))).length;
}

/**
 * Consecutive fully-elapsed past weeks in which the program's weekly
 * session quota (`daysPerWeek`) was met, counting backward from the most
 * recent completed week. Mirrors the adaptation planner's own definition of
 * adherence (`evaluateAdherence` in `@fitness/adaptation-planner`: scheduled
 * sessions per week vs. completed) instead of inventing a separate
 * day-by-day "missed session" concept the data can't actually support —
 * this app's programs rotate by completed-workout count, not a fixed
 * weekday schedule (see `weekStrip.ts`/PROJECT.md). A week counts, full
 * stop: no partial credit, no "streak freeze". The current, still-in-
 * progress week is excluded entirely — it can't have broken or extended
 * the streak yet, since it isn't over.
 */
export function calculateStreak(workoutDates: Date[], daysPerWeek: number, today: Date = new Date()): number {
  if (daysPerWeek <= 0) return 0;

  let weekStart = addDays(startOfIsoWeek(today), -7);
  let streak = 0;
  // Terminates naturally: a week before any workout ever happened has 0 < daysPerWeek
  // training days, so the loop always breaks once it runs out of real data.
  while (distinctTrainingDaysInWeek(workoutDates, weekStart) >= daysPerWeek) {
    streak += 1;
    weekStart = addDays(weekStart, -7);
  }
  return streak;
}
