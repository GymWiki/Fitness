import { describe, expect, it } from 'vitest';
import { distributeSessions } from '../src/distribute';
import type { StrengthDayInput } from '../src/types';

const upperLowerDays: StrengthDayInput[] = [
  { id: 'upper-a', name: 'Bovenlichaam A', isHeavyLowerBody: false },
  { id: 'lower-a', name: 'Onderlichaam A', isHeavyLowerBody: true },
  { id: 'upper-b', name: 'Bovenlichaam B', isHeavyLowerBody: false },
  { id: 'lower-b', name: 'Onderlichaam B', isHeavyLowerBody: true },
];

function dayBefore(weekday: number): number {
  return weekday === 1 ? 7 : weekday - 1;
}

describe('distributeSessions', () => {
  it('spreads strength days across distinct weekdays', () => {
    const plan = distributeSessions(upperLowerDays, [], 'mixed');
    const strengthWeekdays = plan.filter((e) => e.strengthDayId).map((e) => e.weekday);
    expect(new Set(strengthWeekdays).size).toBe(4);
  });

  it('does not place an intensive cardio session on the day before a heavy lower-body day', () => {
    const plan = distributeSessions(upperLowerDays, [{ id: 'interval-1', intensity: 'high' }], 'mixed');
    const heavyWeekdays = plan.filter((e) => ['lower-a', 'lower-b'].includes(e.strengthDayId ?? '')).map((e) => e.weekday);
    const forbiddenWeekdays = heavyWeekdays.map(dayBefore);

    const cardioEntry = plan.find((e) => e.cardioSessionId === 'interval-1');
    expect(cardioEntry).toBeDefined();
    expect(forbiddenWeekdays).not.toContain(cardioEntry!.weekday);
  });

  it('does not place an intensive cardio session on the heavy day itself either', () => {
    const plan = distributeSessions(upperLowerDays, [{ id: 'interval-1', intensity: 'high' }], 'mixed');
    const heavyWeekdays = plan.filter((e) => ['lower-a', 'lower-b'].includes(e.strengthDayId ?? '')).map((e) => e.weekday);

    const cardioEntry = plan.find((e) => e.cardioSessionId === 'interval-1');
    expect(heavyWeekdays).not.toContain(cardioEntry!.weekday);
  });

  it('avoids double-booking two cardio sessions on the same weekday when other days are free', () => {
    const plan = distributeSessions(upperLowerDays, [
      { id: 'zone2-1', intensity: 'low' },
      { id: 'zone2-2', intensity: 'low' },
    ], 'endurance');

    const zone1 = plan.find((e) => e.cardioSessionId === 'zone2-1')!;
    const zone2 = plan.find((e) => e.cardioSessionId === 'zone2-2')!;
    expect(zone1.weekday).not.toBe(zone2.weekday);
  });

  it('still returns a valid plan for a pure-cardio week (no strength days)', () => {
    const plan = distributeSessions([], [{ id: 'zone2-1', intensity: 'low' }], 'endurance');
    expect(plan.some((e) => e.cardioSessionId === 'zone2-1')).toBe(true);
  });

  it('protects even easy cardio from heavy-day adjacency for cardio-centric goals', () => {
    const plan = distributeSessions(upperLowerDays, [{ id: 'zone2-1', intensity: 'low' }], 'endurance');
    const heavyWeekdays = plan.filter((e) => ['lower-a', 'lower-b'].includes(e.strengthDayId ?? '')).map((e) => e.weekday);
    const forbiddenWeekdays = heavyWeekdays.map(dayBefore);

    const cardioEntry = plan.find((e) => e.cardioSessionId === 'zone2-1')!;
    expect(forbiddenWeekdays).not.toContain(cardioEntry.weekday);
  });
});
