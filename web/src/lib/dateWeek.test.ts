import { describe, expect, it } from 'vitest';
import { addDays, isBeforeLocalDay, isSameLocalDay, startOfIsoWeek } from './dateWeek';

describe('startOfIsoWeek', () => {
  it('returns the preceding Monday for a mid-week date', () => {
    const wednesday = new Date(2026, 6, 22); // 2026-07-22 is a Wednesday
    const monday = startOfIsoWeek(wednesday);
    expect(monday.getDay()).toBe(1);
    expect(monday.toDateString()).toBe(new Date(2026, 6, 20).toDateString());
  });

  it('returns the Monday 6 days earlier for a Sunday', () => {
    const sunday = new Date(2026, 6, 26); // 2026-07-26 is a Sunday
    const monday = startOfIsoWeek(sunday);
    expect(monday.toDateString()).toBe(new Date(2026, 6, 20).toDateString());
  });

  it('returns the same day when the date is already a Monday', () => {
    const monday = new Date(2026, 6, 20);
    expect(startOfIsoWeek(monday).toDateString()).toBe(monday.toDateString());
  });

  it('zeroes out the time-of-day', () => {
    const wednesdayEvening = new Date(2026, 6, 22, 23, 59, 59);
    expect(startOfIsoWeek(wednesdayEvening).getHours()).toBe(0);
  });
});

describe('addDays', () => {
  it('adds positive and negative day offsets', () => {
    const base = new Date(2026, 6, 20);
    expect(addDays(base, 3).toDateString()).toBe(new Date(2026, 6, 23).toDateString());
    expect(addDays(base, -3).toDateString()).toBe(new Date(2026, 6, 17).toDateString());
  });

  it('does not mutate the input date', () => {
    const base = new Date(2026, 6, 20);
    addDays(base, 5);
    expect(base.toDateString()).toBe(new Date(2026, 6, 20).toDateString());
  });
});

describe('isSameLocalDay', () => {
  it('is true for the same calendar day at different times', () => {
    expect(isSameLocalDay(new Date(2026, 6, 22, 6, 0), new Date(2026, 6, 22, 23, 0))).toBe(true);
  });

  it('is false across a midnight boundary', () => {
    expect(isSameLocalDay(new Date(2026, 6, 22, 23, 59), new Date(2026, 6, 23, 0, 1))).toBe(false);
  });
});

describe('isBeforeLocalDay', () => {
  it('is true when a is on an earlier calendar day than b, regardless of time-of-day', () => {
    expect(isBeforeLocalDay(new Date(2026, 6, 21, 23, 0), new Date(2026, 6, 22, 0, 1))).toBe(true);
  });

  it('is false for the same calendar day even with a earlier in the day', () => {
    expect(isBeforeLocalDay(new Date(2026, 6, 22, 1, 0), new Date(2026, 6, 22, 23, 0))).toBe(false);
  });

  it('is false when a is after b', () => {
    expect(isBeforeLocalDay(new Date(2026, 6, 23), new Date(2026, 6, 22))).toBe(false);
  });
});
