import type { CardioSessionType, Goal } from './types';

/**
 * How much cardio the generator seeds per goal, and how it's split into
 * sessions. Single source of truth — tune the mix here, not in scattered
 * code paths. Values are a starting point, not a prescription: once real
 * sessions are logged, `@fitness/progression-engine`'s cardio functions
 * take over the actual week-to-week progression.
 *
 * `mixed` gets a substantial, balanced cardio component (bug fix: it was
 * getting none). Every other goal gets at least a light cardiovascular-
 * health base loosely anchored on the WHO's ~150 min/week of moderate
 * activity: hypertrophy/strength keep it deliberately small (interference
 * with lifting recovery), fat_loss/endurance reach the full ~150 min since
 * cardio is already their main focus.
 */
export interface CardioBaseline {
  sessionsPerWeek: number;
  minutesPerSession: number;
}

export const CARDIO_BASELINE_BY_GOAL: Record<Goal, CardioBaseline> = {
  hypertrophy: { sessionsPerWeek: 1, minutesPerSession: 20 },
  strength: { sessionsPerWeek: 1, minutesPerSession: 20 },
  mixed: { sessionsPerWeek: 2, minutesPerSession: 30 },
  fat_loss: { sessionsPerWeek: 3, minutesPerSession: 50 },
  endurance: { sessionsPerWeek: 3, minutesPerSession: 50 },
};

export function weeklyCardioMinutes(goal: Goal): number {
  const baseline = CARDIO_BASELINE_BY_GOAL[goal];
  return baseline.sessionsPerWeek * baseline.minutesPerSession;
}

/**
 * A reasonable zone2/interval split to seed a fresh program with — not a
 * precise 80/20, since there's no history yet to compute one from (that's
 * what `adviseNextCardioType` is for once sessions get logged). One session
 * is always zone2 (never start someone on hard intervals cold); a second
 * session introduces interval work; a third adds a second easy session,
 * approximating a polarized split at low session counts.
 */
export function buildCardioSessionTypes(sessionsPerWeek: number): CardioSessionType[] {
  if (sessionsPerWeek <= 0) return [];
  if (sessionsPerWeek === 1) return ['zone2'];
  if (sessionsPerWeek === 2) return ['zone2', 'interval'];
  return ['zone2', 'zone2', 'interval', ...(Array(Math.max(0, sessionsPerWeek - 3)).fill('zone2') as CardioSessionType[])];
}
