import { describe, expect, it } from 'vitest';
import { computeWeekStrip } from './weekStrip';

// Week of 2026-07-20 (Mon) .. 2026-07-26 (Sun); "today" in these tests is Friday 2026-07-24 unless noted.
const MON = new Date(2026, 6, 20);
const TUE = new Date(2026, 6, 21);
const WED = new Date(2026, 6, 22);
const THU = new Date(2026, 6, 23);
const FRI = new Date(2026, 6, 24);
const SAT = new Date(2026, 6, 25);
const SUN = new Date(2026, 6, 26);

function statuses(days: ReturnType<typeof computeWeekStrip>): string[] {
  return days.map((d) => d.status);
}

describe('computeWeekStrip', () => {
  it('marks trained days done and the rest of the week rest once the weekly quota is met', () => {
    const days = computeWeekStrip([MON, WED, FRI], 3, FRI);
    expect(statuses(days)).toEqual(['done', 'rest', 'done', 'rest', 'done', 'rest', 'rest']);
  });

  it('marks past empty days missed while the weekly quota is still unmet', () => {
    // Only Monday trained so far, quota is 3, today is Thursday: Tue/Wed passed without a log.
    const days = computeWeekStrip([MON], 3, THU);
    expect(statuses(days)).toEqual(['done', 'missed', 'missed', 'planned', 'planned', 'planned', 'planned']);
  });

  it('marks today as "planned" (not "missed") when there is no log yet and quota is unmet', () => {
    const days = computeWeekStrip([MON], 3, WED);
    const today = days.find((d) => d.isToday);
    expect(today?.status).toBe('planned');
  });

  it('flags exactly one day as isToday, matching the given reference date', () => {
    const days = computeWeekStrip([], 3, WED);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days.find((d) => d.isToday)?.date.toDateString()).toBe(WED.toDateString());
  });

  it('training beyond the weekly quota still shows as done, never breaks anything', () => {
    const days = computeWeekStrip([MON, TUE, WED, THU, FRI], 3, FRI);
    expect(statuses(days)).toEqual(['done', 'done', 'done', 'done', 'done', 'rest', 'rest']);
  });

  it('ignores workouts from a different week entirely', () => {
    const lastWeekWednesday = new Date(2026, 6, 15);
    const days = computeWeekStrip([lastWeekWednesday], 3, WED);
    expect(days.every((d) => d.status !== 'done')).toBe(true);
  });

  it('never marks a future day missed, only planned or rest', () => {
    const days = computeWeekStrip([], 3, MON);
    const future = days.filter((d) => !d.isToday && d.date > MON);
    expect(future.every((d) => d.status === 'planned' || d.status === 'rest')).toBe(true);
    expect(future.some((d) => d.status === 'missed')).toBe(false);
  });

  it('treats multiple sessions on the same day as a single trained day', () => {
    const days = computeWeekStrip([new Date(2026, 6, 20, 8), new Date(2026, 6, 20, 18)], 1, MON);
    expect(days[0]!.status).toBe('done');
  });

  it('shows the weekend as rest once the quota was already met earlier in the week', () => {
    const days = computeWeekStrip([MON, WED, FRI], 3, SUN);
    const [, , , , , saturday, sunday] = days;
    expect(saturday!.date.toDateString()).toBe(SAT.toDateString());
    expect(saturday!.status).toBe('rest');
    expect(sunday!.date.toDateString()).toBe(SUN.toDateString());
    expect(sunday!.status).toBe('rest');
    expect(sunday!.isToday).toBe(true);
  });
});
