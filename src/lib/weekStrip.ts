import { addDays, isBeforeLocalDay, isSameLocalDay, startOfIsoWeek } from './dateWeek';

export type WeekDayStatus = 'done' | 'planned' | 'rest' | 'missed';

export interface WeekStripDay {
  date: Date;
  status: WeekDayStatus;
  isToday: boolean;
}

/**
 * Derives a 7-day (Monday-Sunday) status strip for the week containing
 * `today`, from the program's weekly session target (`daysPerWeek`) and the
 * user's actual workout dates — no new data source, just a same-week
 * summary of data already tracked (`fetchActiveProgram` + workout logs).
 *
 * This app's programs rotate through day 1/2/3/... by completed-workout
 * count (see `fetchActiveProgram` in programs.ts), not a fixed weekday
 * schedule — there's no "Wednesday is push day" concept to read from. So
 * this deliberately does NOT try to guess which specific weekday a session
 * was "supposed to" land on: a day only ever reads 'missed' or 'rest' based
 * on whether the week's overall quota (`daysPerWeek` distinct training
 * days) was already met by the time that day passed, applied uniformly to
 * every empty day rather than pinning an assumed plan to one date.
 */
export function computeWeekStrip(workoutDates: Date[], daysPerWeek: number, today: Date = new Date()): WeekStripDay[] {
  const weekStart = startOfIsoWeek(today);
  const daysInWeek = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const trainedDayCount = daysInWeek.filter((day) => workoutDates.some((workoutDate) => isSameLocalDay(workoutDate, day))).length;
  const quotaMet = trainedDayCount >= daysPerWeek;

  return daysInWeek.map((date) => {
    const hasLog = workoutDates.some((workoutDate) => isSameLocalDay(workoutDate, date));
    const status: WeekDayStatus = hasLog ? 'done' : quotaMet ? 'rest' : isBeforeLocalDay(date, today) ? 'missed' : 'planned';
    return { date, status, isToday: isSameLocalDay(date, today) };
  });
}
