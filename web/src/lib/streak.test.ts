import { describe, expect, it } from 'vitest';
import { calculateStreak } from './streak';

const TODAY = new Date(2026, 6, 22); // Wednesday, in the middle of the current (in-progress) week

// Monday of each fully-elapsed past week.
const WEEK_1_AGO = new Date(2026, 6, 13);
const WEEK_2_AGO = new Date(2026, 6, 6);
const WEEK_3_AGO = new Date(2026, 5, 29);
const WEEK_4_AGO = new Date(2026, 5, 22);

function daysInWeek(monday: Date, ...offsets: number[]): Date[] {
  return offsets.map((offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset));
}

describe('calculateStreak', () => {
  it('is 0 with no workout history at all', () => {
    expect(calculateStreak([], 3, TODAY)).toBe(0);
  });

  it('counts consecutive fully-elapsed past weeks that hit the weekly quota', () => {
    const workouts = [...daysInWeek(WEEK_1_AGO, 0, 2, 4), ...daysInWeek(WEEK_2_AGO, 0, 2, 4)];
    expect(calculateStreak(workouts, 3, TODAY)).toBe(2);
  });

  it('resets to 0 when the most recent fully-elapsed week fell short, even if older weeks were fine', () => {
    const workouts = [...daysInWeek(WEEK_1_AGO, 0, 2), ...daysInWeek(WEEK_2_AGO, 0, 2, 4)]; // week 1 ago: only 2 of 3
    expect(calculateStreak(workouts, 3, TODAY)).toBe(0);
  });

  it('stops counting at the first shortfall further back, ignoring any older good weeks beyond it', () => {
    const workouts = [
      ...daysInWeek(WEEK_1_AGO, 0, 2, 4),
      ...daysInWeek(WEEK_2_AGO, 0, 2, 4),
      ...daysInWeek(WEEK_3_AGO, 0, 2, 4),
      ...daysInWeek(WEEK_4_AGO, 0), // shortfall: only 1 of 3
    ];
    expect(calculateStreak(workouts, 3, TODAY)).toBe(3);
  });

  it('never counts or breaks on the current, still-in-progress week', () => {
    const pastWeeks = [...daysInWeek(WEEK_1_AGO, 0, 2, 4), ...daysInWeek(WEEK_2_AGO, 0, 2, 4)];
    const withoutThisWeek = calculateStreak(pastWeeks, 3, TODAY);
    const withPartialThisWeek = calculateStreak([...pastWeeks, TODAY], 3, TODAY); // 1 session logged today
    expect(withPartialThisWeek).toBe(withoutThisWeek);
    expect(withPartialThisWeek).toBe(2);
  });

  it('counts multiple sessions on the same day as a single training day, not double credit', () => {
    const sameDayTwice = [new Date(2026, 6, 13, 8), new Date(2026, 6, 13, 18)];
    const workouts = [...sameDayTwice, ...daysInWeek(WEEK_1_AGO, 2, 4)];
    expect(calculateStreak(workouts, 3, TODAY)).toBe(1);
  });

  it('never crashes and returns 0 for a non-positive daysPerWeek', () => {
    expect(calculateStreak([WEEK_1_AGO], 0, TODAY)).toBe(0);
    expect(calculateStreak([WEEK_1_AGO], -1, TODAY)).toBe(0);
  });
});
