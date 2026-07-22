import type { CardioSessionInput, Goal, StrengthDayInput, Weekday, WeekPlanEntry } from './types';

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Evenly-spaced weekday slots per day count, same spirit as the program generator's day archetypes. */
const STRENGTH_WEEKDAY_PATTERNS: Record<number, Weekday[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

function dayBefore(weekday: Weekday): Weekday {
  return (weekday === 1 ? 7 : weekday - 1) as Weekday;
}

/**
 * Lays strength days out over the week, then slots cardio sessions into the
 * remaining days — keeping intensive cardio off both the heavy leg day
 * itself and the day right before it (interference: not enough recovery
 * window otherwise). Goals where cardio is a primary focus (endurance/
 * fat_loss/mixed) apply that same protection even to easy zone2 work;
 * strength/hypertrophy goals only protect the hard sessions, since easy
 * cardio there is a low-cost add-on to a lifting day rather than something
 * that needs its own slot.
 *
 * `preferredWeekdays`, when given and matching `strengthDays.length` exactly
 * (after de-duplication), overrides the built-in evenly-spaced pattern with
 * the user's own chosen training days — this is what lets a calendar-based
 * schedule stay on "ma/wo/vr" forever instead of an arbitrary spread. Any
 * mismatch (wrong count, out-of-range weekday) falls back to the default
 * pattern rather than producing a broken plan.
 */
export function distributeSessions(
  strengthDays: StrengthDayInput[],
  cardioSessions: CardioSessionInput[],
  goal: Goal,
  preferredWeekdays?: Weekday[],
): WeekPlanEntry[] {
  const dedupedPreferred = preferredWeekdays ? [...new Set(preferredWeekdays)].sort((a, b) => a - b) : undefined;
  const pattern =
    dedupedPreferred && dedupedPreferred.length === strengthDays.length
      ? dedupedPreferred
      : (STRENGTH_WEEKDAY_PATTERNS[strengthDays.length] ?? WEEKDAYS.slice(0, strengthDays.length));
  const entries: WeekPlanEntry[] = pattern.map((weekday, index) => ({
    weekday,
    strengthDayId: strengthDays[index]?.id,
  }));

  const strengthWeekdays = new Set(entries.map((entry) => entry.weekday));
  const heavyWeekdays = new Set(
    entries.filter((entry) => strengthDays.find((day) => day.id === entry.strengthDayId)?.isHeavyLowerBody).map((entry) => entry.weekday),
  );
  const dayBeforeHeavyWeekdays = new Set([...heavyWeekdays].map(dayBefore));

  const cardioProtectsEasySessions = goal === 'endurance' || goal === 'fat_loss' || goal === 'mixed';
  const cardioWeekdaysUsed = new Set<Weekday>();

  const sortedSessions = [...cardioSessions].sort((a, b) => (a.intensity === b.intensity ? 0 : a.intensity === 'high' ? -1 : 1));

  for (const session of sortedSessions) {
    const avoidsHeavyAdjacency = session.intensity === 'high' || cardioProtectsEasySessions;
    const forbidden = avoidsHeavyAdjacency ? new Set([...heavyWeekdays, ...dayBeforeHeavyWeekdays]) : new Set<Weekday>();

    const candidates = WEEKDAYS.filter((weekday) => !forbidden.has(weekday));
    const restDayCandidates = candidates.filter((weekday) => !strengthWeekdays.has(weekday) && !cardioWeekdaysUsed.has(weekday));
    const nonStrengthCandidates = candidates.filter((weekday) => !strengthWeekdays.has(weekday));
    const unusedCandidates = candidates.filter((weekday) => !cardioWeekdaysUsed.has(weekday));

    const chosenWeekday = restDayCandidates[0] ?? nonStrengthCandidates[0] ?? unusedCandidates[0] ?? candidates[0] ?? WEEKDAYS[0]!;
    cardioWeekdaysUsed.add(chosenWeekday);

    const existingEntry = entries.find((entry) => entry.weekday === chosenWeekday);
    if (existingEntry) {
      existingEntry.cardioSessionId = session.id;
    } else {
      entries.push({ weekday: chosenWeekday, cardioSessionId: session.id });
    }
  }

  return entries.sort((a, b) => a.weekday - b.weekday);
}
