export interface NutrientsPer100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface ScaledNutrients {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Scales Open Food Facts' per-100g figures to an actual logged quantity. Pure — kept out of the UI so every call site scales the same way. */
export function scaleNutrients(per100g: NutrientsPer100g, quantityGrams: number): ScaledNutrients {
  const factor = quantityGrams / 100;
  return {
    calories: Math.round(per100g.caloriesPer100g * factor),
    proteinGrams: roundTo1Decimal(per100g.proteinPer100g * factor),
    carbsGrams: roundTo1Decimal(per100g.carbsPer100g * factor),
    fatGrams: roundTo1Decimal(per100g.fatPer100g * factor),
  };
}
