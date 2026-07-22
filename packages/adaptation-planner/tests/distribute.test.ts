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

  it('uses preferredWeekdays for strength days when the count matches exactly', () => {
    const threeDays: StrengthDayInput[] = [
      { id: 'a', name: 'Full Body A', isHeavyLowerBody: true },
      { id: 'b', name: 'Full Body B', isHeavyLowerBody: true },
      { id: 'c', name: 'Full Body C', isHeavyLowerBody: true },
    ];
    const plan = distributeSessions(threeDays, [], 'mixed', [1, 3, 5]);
    const strengthWeekdays = plan.filter((e) => e.strengthDayId).map((e) => e.weekday).sort();
    expect(strengthWeekdays).toEqual([1, 3, 5]);
  });

  it('maps preferredWeekdays to strength days in ascending weekday order regardless of input order', () => {
    const threeDays: StrengthDayInput[] = [
      { id: 'first', name: 'Day 1', isHeavyLowerBody: false },
      { id: 'second', name: 'Day 2', isHeavyLowerBody: false },
      { id: 'third', name: 'Day 3', isHeavyLowerBody: false },
    ];
    const plan = distributeSessions(threeDays, [], 'mixed', [5, 1, 3]);
    expect(plan.find((e) => e.strengthDayId === 'first')?.weekday).toBe(1);
    expect(plan.find((e) => e.strengthDayId === 'second')?.weekday).toBe(3);
    expect(plan.find((e) => e.strengthDayId === 'third')?.weekday).toBe(5);
  });

  it('falls back to the default pattern when preferredWeekdays length does not match strengthDays', () => {
    const plan = distributeSessions(upperLowerDays, [], 'mixed', [1, 3]);
    const strengthWeekdays = new Set(plan.filter((e) => e.strengthDayId).map((e) => e.weekday));
    expect(strengthWeekdays.size).toBe(4);
  });

  it('falls back to the default pattern when preferredWeekdays has duplicates collapsing below the required count', () => {
    const threeDays: StrengthDayInput[] = [
      { id: 'a', name: 'Day A', isHeavyLowerBody: false },
      { id: 'b', name: 'Day B', isHeavyLowerBody: false },
      { id: 'c', name: 'Day C', isHeavyLowerBody: false },
    ];
    const plan = distributeSessions(threeDays, [], 'mixed', [1, 1, 3]);
    const strengthWeekdays = new Set(plan.filter((e) => e.strengthDayId).map((e) => e.weekday));
    expect(strengthWeekdays.size).toBe(3);
  });

  it('still protects heavy-day adjacency when strength days are pinned to preferredWeekdays', () => {
    const plan = distributeSessions(upperLowerDays, [{ id: 'interval-1', intensity: 'high' }], 'mixed', [1, 2, 4, 5]);
    const heavyWeekdays = plan.filter((e) => ['lower-a', 'lower-b'].includes(e.strengthDayId ?? '')).map((e) => e.weekday);
    const forbiddenWeekdays = [...heavyWeekdays, ...heavyWeekdays.map(dayBefore)];

    const cardioEntry = plan.find((e) => e.cardioSessionId === 'interval-1');
    expect(cardioEntry).toBeDefined();
    expect(forbiddenWeekdays).not.toContain(cardioEntry!.weekday);
  });

  it('protects the mix goal\'s newly-generated cardio baseline from heavy-day adjacency too (bugfix confirmation)', () => {
    // Shaped like what @fitness/program-generator now seeds for goal 'mixed'
    // (buildCardioSessionTypes(2) => ['zone2', 'interval']) — this was previously
    // never scheduled at all because it was never generated. distributeSessions
    // itself needs no changes: it already protects all cardio for 'mixed'.
    const generatorShapedCardio = [
      { id: 'zone2-1', intensity: 'low' as const },
      { id: 'interval-1', intensity: 'high' as const },
    ];
    const plan = distributeSessions(upperLowerDays, generatorShapedCardio, 'mixed');
    const heavyWeekdays = plan.filter((e) => ['lower-a', 'lower-b'].includes(e.strengthDayId ?? '')).map((e) => e.weekday);
    const forbiddenWeekdays = [...heavyWeekdays, ...heavyWeekdays.map(dayBefore)];

    for (const session of generatorShapedCardio) {
      const cardioEntry = plan.find((e) => e.cardioSessionId === session.id);
      expect(cardioEntry).toBeDefined();
      expect(forbiddenWeekdays).not.toContain(cardioEntry!.weekday);
    }
  });
});
