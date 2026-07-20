import type { DeloadDecision, RecentWeekSummary } from './types';

/** Default load/deload cycle length, the midpoint of the requested 4-6 week range. */
const DEFAULT_CYCLE_LENGTH_WEEKS = 5;

/** How many weeks have passed since the most recent deload (0 if the most recent week itself was a deload). */
function weeksSinceLastDeload(sortedWeeks: RecentWeekSummary[]): number {
  const mostRecentDeloadIndex = [...sortedWeeks].reverse().findIndex((week) => week.wasDeload);
  if (mostRecentDeloadIndex === -1) return sortedWeeks.length;
  return mostRecentDeloadIndex;
}

/**
 * Decides whether the upcoming week should be a deload, either because the
 * regular load/deload cycle is due, or because recovery signals showed up
 * two weeks in a row (the same "two strikes" principle the strength engine
 * uses before reacting to a single bad session).
 */
export function shouldDeload(recentWeeks: RecentWeekSummary[], cycleLengthWeeks = DEFAULT_CYCLE_LENGTH_WEEKS): DeloadDecision {
  if (recentWeeks.length === 0) {
    return { shouldDeload: false, reason: 'Nog geen weekgeschiedenis om op te baseren.' };
  }

  const sortedWeeks = [...recentWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const weeksSince = weeksSinceLastDeload(sortedWeeks);

  if (weeksSince >= cycleLengthWeeks) {
    return {
      shouldDeload: true,
      reason: `${weeksSince} weken sinds de laatste deload (streefcyclus: elke ${cycleLengthWeeks} weken).`,
    };
  }

  const lastTwoWeeks = sortedWeeks.slice(-2);
  if (lastTwoWeeks.length === 2 && lastTwoWeeks.every((week) => week.hasRecoverySignal)) {
    return {
      shouldDeload: true,
      reason: 'Twee weken op rij herstelsignalen (reps onder de streef-range), dus eerder een deload dan de geplande cyclus.',
    };
  }

  return {
    shouldDeload: false,
    reason: `Nog ${cycleLengthWeeks - weeksSince} weken tot de volgende geplande deload, geen vroege herstelsignalen.`,
  };
}
