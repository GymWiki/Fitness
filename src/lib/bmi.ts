/** BMI = weight(kg) / height(m)^2. Pure calculation, no I/O. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: 'Ondergewicht',
  normal: 'Gezond gewicht',
  overweight: 'Overgewicht',
  obese: 'Obesitas',
};

/** Standard caveat: BMI doesn't account for muscle mass, so it's a rough indicator here, not a verdict. */
export const BMI_CAVEAT =
  'BMI houdt geen rekening met spiermassa — bij gespierde mensen zegt de waarde relatief weinig. Zie het als een ruwe indicatie, geen oordeel.';
