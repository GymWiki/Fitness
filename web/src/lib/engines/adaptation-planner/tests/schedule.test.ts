import { describe, expect, it } from 'vitest';
import { distributeSessions } from '../src/distribute';
import { addDaysIso, buildScheduleDates, isoWeekdayOf } from '../src/schedule';
import type { StrengthDayInput } from '../src/types';

describe('isoWeekdayOf', () => {
  it('maps known dates to the right ISO weekday (1=Monday..7=Sunday)', () => {
    expect(isoWeekdayOf('2026-07-20')).toBe(1); // a Monday
    expect(isoWeekdayOf('2026-07-25')).toBe(6); // a Saturday
    expect(isoWeekdayOf('2026-07-26')).toBe(7); // a Sunday
  });
});

describe('addDaysIso', () => {
  it('adds days without drifting across a month boundary', () => {
    expect(addDaysIso('2026-07-30', 3)).toBe('2026-08-02');
  });

  it('supports negative offsets', () => {
    expect(addDaysIso('2026-08-02', -3)).toBe('2026-07-30');
  });
});

describe('buildScheduleDates', () => {
  const threeDays: StrengthDayInput[] = [
    { id: 'day-a', name: 'Full Body A', isHeavyLowerBody: false },
    { id: 'day-b', name: 'Full Body B', isHeavyLowerBody: false },
    { id: 'day-c', name: 'Full Body C', isHeavyLowerBody: false },
  ];

  it('places sessions exactly on the preferred weekdays (ma/wo/vr) across a 2-week window', () => {
    const weekPlan = distributeSessions(threeDays, [], 'mixed', [1, 3, 5]); // ma/wo/vr
    const plan = buildScheduleDates(weekPlan, '2026-07-20', '2026-08-02'); // 2 full weeks, starting on a Monday

    const trainingDates = plan.filter((entry) => entry.programDayId !== null);
    expect(trainingDates.every((entry) => [1, 3, 5].includes(entry.weekday))).toBe(true);
    // 2 weeks * 3 training days/week = 6 scheduled sessions.
    expect(trainingDates.length).toBe(6);

    const restDates = plan.filter((entry) => entry.programDayId === null);
    expect(restDates.every((entry) => [2, 4, 6, 7].includes(entry.weekday))).toBe(true);
  });

  it('covers every date in the range exactly once, inclusive of both ends', () => {
    const weekPlan = distributeSessions(threeDays, [], 'mixed', [1, 3, 5]);
    const plan = buildScheduleDates(weekPlan, '2026-07-20', '2026-07-26');
    expect(plan.map((entry) => entry.date)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });

  it('repeats the same weekly pattern identically across multiple weeks', () => {
    const weekPlan = distributeSessions(threeDays, [], 'mixed', [1, 3, 5]);
    const plan = buildScheduleDates(weekPlan, '2026-07-20', '2026-08-02');
    const week1 = plan.slice(0, 7).map((entry) => entry.programDayId);
    const week2 = plan.slice(7, 14).map((entry) => entry.programDayId);
    expect(week1).toEqual(week2);
  });
});
