import { describe, expect, it } from 'vitest';
import { scaleNutrients } from '../src/scale';

describe('scaleNutrients', () => {
  const per100g = { caloriesPer100g: 250, proteinPer100g: 20, carbsPer100g: 10, fatPer100g: 8 };

  it('returns the per-100g values unchanged for a 100g quantity', () => {
    expect(scaleNutrients(per100g, 100)).toEqual({ calories: 250, proteinGrams: 20, carbsGrams: 10, fatGrams: 8 });
  });

  it('scales down for a smaller quantity', () => {
    expect(scaleNutrients(per100g, 50)).toEqual({ calories: 125, proteinGrams: 10, carbsGrams: 5, fatGrams: 4 });
  });

  it('scales up for a larger quantity', () => {
    expect(scaleNutrients(per100g, 250)).toEqual({ calories: 625, proteinGrams: 50, carbsGrams: 25, fatGrams: 20 });
  });

  it('returns zero for a zero quantity', () => {
    expect(scaleNutrients(per100g, 0)).toEqual({ calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 });
  });

  it('rounds macros to one decimal place for odd quantities', () => {
    const result = scaleNutrients(per100g, 33);
    expect(result.proteinGrams).toBe(6.6);
  });
});
