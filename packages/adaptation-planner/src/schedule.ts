import type { Weekday, WeekPlanEntry } from './types';

export interface ScheduledDatePlan {
  /** ISO yyyy-mm-dd, local calendar day. */
  date: string;
  weekday: Weekday;
  /** The program_day id to train this date, or null for a rest day. */
  programDayId: string | null;
}

/** 1 = Monday ... 7 = Sunday, for a plain `yyyy-mm-dd` string — parsed as a local calendar date, never UTC, so it can't drift a day depending on timezone. */
export function isoWeekdayOf(dateIso: string): Weekday {
  const [year, month, day] = dateIso.split('-').map(Number) as [number, number, number];
  const jsDay = new Date(year, month - 1, day).getDay(); // 0 = Sunday .. 6 = Saturday
  return (jsDay === 0 ? 7 : jsDay) as Weekday;
}

/** Adds `days` (positive or negative) to a `yyyy-mm-dd` string, staying in local calendar-day arithmetic. */
export function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tiles a single week's plan (from `distributeSessions`) across every
 * calendar date from `startDateIso` to `endDateIso` (inclusive). One week's
 * plan is enough to cover any range because preferred training days are
 * fixed — the same weekday pattern simply repeats every week, which is what
 * makes the rolling 2-week window predictable instead of re-derived from
 * scratch each time it's extended.
 */
export function buildScheduleDates(weekPlan: WeekPlanEntry[], startDateIso: string, endDateIso: string): ScheduledDatePlan[] {
  const entryByWeekday = new Map(weekPlan.map((entry) => [entry.weekday, entry]));
  const dates: ScheduledDatePlan[] = [];
  let cursor = startDateIso;
  while (cursor <= endDateIso) {
    const weekday = isoWeekdayOf(cursor);
    const entry = entryByWeekday.get(weekday);
    dates.push({ date: cursor, weekday, programDayId: entry?.strengthDayId ?? entry?.cardioSessionId ?? null });
    cursor = addDaysIso(cursor, 1);
  }
  return dates;
}
