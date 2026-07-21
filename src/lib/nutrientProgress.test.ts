import { describe, expect, it } from 'vitest';
import { describeNutrientProgress } from './nutrientProgress';

describe('describeNutrientProgress', () => {
  it('reports the full target remaining when nothing has been eaten yet', () => {
    const result = describeNutrientProgress(0, 2200, ' kcal');
    expect(result.percent).toBe(0);
    expect(result.isOverTarget).toBe(false);
    expect(result.remainingLabel).toBe('nog 2200 kcal');
  });

  it('fills proportionally and reports the concrete remaining amount, not just a percentage', () => {
    const result = describeNutrientProgress(1400, 2200, ' kcal');
    expect(result.percent).toBeCloseTo((1400 / 2200) * 100);
    expect(result.isOverTarget).toBe(false);
    expect(result.remainingLabel).toBe('nog 800 kcal');
  });

  it('caps the fill at exactly 100% when current equals target, with nothing left', () => {
    const result = describeNutrientProgress(150, 150, 'g');
    expect(result.percent).toBe(100);
    expect(result.isOverTarget).toBe(false);
    expect(result.remainingLabel).toBe('nog 0g');
  });

  it('caps the bar at 100% and switches to an "over target" label instead of a negative remaining number', () => {
    const result = describeNutrientProgress(212, 200, 'g');
    expect(result.percent).toBe(100);
    expect(result.isOverTarget).toBe(true);
    expect(result.remainingLabel).toBe('12g boven doel');
  });

  it('rounds fractional grams/calories in the label', () => {
    const under = describeNutrientProgress(1400.6, 2200, ' kcal');
    expect(under.remainingLabel).toBe('nog 799 kcal');

    const over = describeNutrientProgress(212.4, 200, 'g');
    expect(over.remainingLabel).toBe('12g boven doel');
  });

  it('never crashes on a zero/negative target and reports nothing remaining', () => {
    const result = describeNutrientProgress(50, 0, ' kcal');
    expect(result.percent).toBe(0);
    expect(result.isOverTarget).toBe(false);
    expect(result.remainingLabel).toBe('nog 0 kcal');
  });
});
