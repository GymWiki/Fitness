import { describe, expect, it } from 'vitest';
import { calculateNutritionTargets, CALORIE_ADJUSTMENT_BY_GOAL, PROTEIN_G_PER_KG_BY_GOAL, activityMultiplierForDaysPerWeek } from '../src/targets';
import type { NutritionGoal, NutritionProfileInput } from '../src/types';

function profile(overrides: Partial<NutritionProfileInput> = {}): NutritionProfileInput {
  return {
    weightKg: 80,
    heightCm: 180,
    gender: 'male',
    age: 30,
    daysPerWeek: 4,
    goal: 'hypertrophy',
    ...overrides,
  };
}

const ALL_GOALS: NutritionGoal[] = ['hypertrophy', 'strength', 'endurance', 'fat_loss', 'mixed'];

describe('activityMultiplierForDaysPerWeek', () => {
  it('increases monotonically with training frequency', () => {
    const multipliers = [1, 2, 3, 4, 5, 6, 7].map(activityMultiplierForDaysPerWeek);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]!).toBeGreaterThanOrEqual(multipliers[i - 1]!);
    }
  });
});

describe('calculateNutritionTargets', () => {
  it('gives every goal a positive, sensible calorie and protein target', () => {
    for (const goal of ALL_GOALS) {
      const targets = calculateNutritionTargets(profile({ goal }));
      expect(targets.calories).toBeGreaterThan(1000);
      expect(targets.proteinGrams).toBeGreaterThan(0);
      expect(targets.fatGrams).toBeGreaterThan(0);
      expect(targets.carbGrams).toBeGreaterThanOrEqual(0);
      expect(targets.bmr).toBeGreaterThan(0);
      expect(targets.tdee).toBeGreaterThan(targets.bmr);
    }
  });

  it('gives hypertrophy a calorie surplus and fat_loss a deficit relative to strength (maintenance)', () => {
    const strength = calculateNutritionTargets(profile({ goal: 'strength' }));
    const hypertrophy = calculateNutritionTargets(profile({ goal: 'hypertrophy' }));
    const fatLoss = calculateNutritionTargets(profile({ goal: 'fat_loss' }));

    expect(hypertrophy.calories).toBeGreaterThan(strength.calories);
    expect(fatLoss.calories).toBeLessThan(strength.calories);
  });

  it('keeps endurance/mixed near maintenance, distinct from the surplus/deficit goals', () => {
    const strength = calculateNutritionTargets(profile({ goal: 'strength' }));
    const endurance = calculateNutritionTargets(profile({ goal: 'endurance' }));
    const mixed = calculateNutritionTargets(profile({ goal: 'mixed' }));

    expect(endurance.calories).toBe(strength.calories);
    expect(mixed.calories).toBe(strength.calories);
  });

  it('keeps fat_loss protein at least as high as hypertrophy/strength, to protect muscle in a deficit', () => {
    const fatLoss = calculateNutritionTargets(profile({ goal: 'fat_loss' }));
    const hypertrophy = calculateNutritionTargets(profile({ goal: 'hypertrophy' }));
    expect(fatLoss.proteinPerKg).toBeGreaterThanOrEqual(hypertrophy.proteinPerKg);
  });

  it('gives hypertrophy/strength a higher protein target than endurance/mixed', () => {
    const hypertrophy = calculateNutritionTargets(profile({ goal: 'hypertrophy' }));
    const endurance = calculateNutritionTargets(profile({ goal: 'endurance' }));
    expect(hypertrophy.proteinGrams).toBeGreaterThan(endurance.proteinGrams);
  });

  it('scales protein and calories with bodyweight', () => {
    const lighter = calculateNutritionTargets(profile({ weightKg: 60 }));
    const heavier = calculateNutritionTargets(profile({ weightKg: 100 }));
    expect(heavier.proteinGrams).toBeGreaterThan(lighter.proteinGrams);
    expect(heavier.calories).toBeGreaterThan(lighter.calories);
  });

  it('increases the target with training frequency (higher activity multiplier)', () => {
    const low = calculateNutritionTargets(profile({ daysPerWeek: 2 }));
    const high = calculateNutritionTargets(profile({ daysPerWeek: 6 }));
    expect(high.calories).toBeGreaterThan(low.calories);
  });

  it('does not exclude a non-binary gender from a target (uses the male/female BMR midpoint)', () => {
    const targets = calculateNutritionTargets(profile({ gender: 'other' }));
    const male = calculateNutritionTargets(profile({ gender: 'male' }));
    const female = calculateNutritionTargets(profile({ gender: 'female' }));
    expect(targets.bmr).toBeGreaterThan(female.bmr);
    expect(targets.bmr).toBeLessThan(male.bmr);
  });

  it('respects proteinPerKgOverride and fatPercentOverride', () => {
    const targets = calculateNutritionTargets(profile({ weightKg: 80 }), { proteinPerKgOverride: 2.2, fatPercentOverride: 0.3 });
    expect(targets.proteinPerKg).toBe(2.2);
    expect(targets.proteinGrams).toBe(Math.round(80 * 2.2));
  });

  it('macro calories (protein + fat + carbs) never exceed the calorie target', () => {
    for (const goal of ALL_GOALS) {
      const targets = calculateNutritionTargets(profile({ goal }));
      const macroCalories = targets.proteinGrams * 4 + targets.fatGrams * 9 + targets.carbGrams * 4;
      expect(macroCalories).toBeLessThanOrEqual(targets.calories + 5); // rounding slack
    }
  });

  it('every goal has a config entry in both per-goal tables (single source of truth)', () => {
    for (const goal of ALL_GOALS) {
      expect(CALORIE_ADJUSTMENT_BY_GOAL[goal]).toBeGreaterThan(0);
      expect(PROTEIN_G_PER_KG_BY_GOAL[goal]).toBeGreaterThan(0);
    }
  });
});
