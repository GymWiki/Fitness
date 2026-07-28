/**
 * Small local-calendar-day date helpers shared by `weekStrip.ts` and
 * `streak.ts`. Deliberately local-time (not UTC) — "which day is this" for
 * a training log should match the user's own calendar, not a server
 * timezone.
 */

/** Monday 00:00 (local time) of the week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Calendar-day equality, ignoring time-of-day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** True when `a`'s calendar day is strictly before `b`'s, ignoring time-of-day. */
export function isBeforeLocalDay(a: Date, b: Date): boolean {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDay.getTime() < bDay.getTime();
}
