import { describe, expect, it } from 'vitest';
import { detectProteinShortfall } from '../src/proteinShortfall';
import type { DailyProteinTotal } from '../src/types';

function days(proteinGrams: number[]): DailyProteinTotal[] {
  return proteinGrams.map((grams, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, proteinGrams: grams }));
}

describe('detectProteinShortfall', () => {
  const target = 150;

  it('does not fire with no data', () => {
    expect(detectProteinShortfall([], target)).toBe(false);
  });

  it('does not fire with fewer days logged than the threshold, even if all are under target', () => {
    expect(detectProteinShortfall(days([100, 110]), target)).toBe(false);
  });

  it('fires once exactly the threshold number of consecutive recent days are all under target', () => {
    expect(detectProteinShortfall(days([100, 110, 120]), target)).toBe(true);
  });

  it('does not fire if a single day in the most recent streak met or exceeded the target', () => {
    expect(detectProteinShortfall(days([100, 160, 120]), target)).toBe(false);
  });

  it('only looks at the most recent streak, not the full history', () => {
    // Oldest day is under target, but the three most recent are all fine.
    expect(detectProteinShortfall(days([50, 160, 160, 160]), target)).toBe(false);
  });

  it('fires when the most recent days (beyond the threshold) are under target too', () => {
    expect(detectProteinShortfall(days([160, 100, 110, 120]), target)).toBe(true);
  });

  it('respects a custom consecutiveDaysThreshold', () => {
    const fourUnderDays = days([100, 110, 120, 130]);
    expect(detectProteinShortfall(fourUnderDays, target, 5)).toBe(false);
    expect(detectProteinShortfall(fourUnderDays, target, 4)).toBe(true);
  });

  it('treats a day exactly at the target as meeting it, not falling short', () => {
    expect(detectProteinShortfall(days([target, target, target]), target)).toBe(false);
  });
});
