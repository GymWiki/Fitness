import { addDays, isSameLocalDay } from './dateWeek';
import { toLocalDateString } from './dates';
import type { ScheduledSessionRow, ScheduledSessionStatus } from './schedule';

export interface ScheduleCardDay {
  date: Date;
  /** yyyy-mm-dd. */
  dateIso: string;
  status: ScheduledSessionStatus;
  isToday: boolean;
  programDayName: string | null;
  programDayKind: 'strength' | 'cardio' | null;
}

/**
 * Builds exactly 7 day-cards (Monday-Sunday) for the ISO week starting at
 * `weekStart`, from the same `ScheduledSessionRow[]` the schema page already
 * fetches. A day with no matching row (e.g. the edge of a not-yet-generated
 * window) falls back to a 'rest' placeholder — same convention as
 * `scheduleToWeekStrip`, so an empty day never renders as a gap.
 */
export function buildWeekCards(rows: ScheduledSessionRow[], weekStart: Date, today: Date = new Date()): ScheduleCardDay[] {
  const rowByDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateIso = toLocalDateString(date);
    const row = rowByDate.get(dateIso);
    return {
      date,
      dateIso,
      status: row?.status ?? 'rest',
      isToday: isSameLocalDay(date, today),
      programDayName: row?.programDayName ?? null,
      programDayKind: row?.programDayKind ?? null,
    };
  });
}
