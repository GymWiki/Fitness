export interface NutrientProgress {
  /** 0-100, always capped — a bar never visually overflows past its target. */
  percent: number;
  isOverTarget: boolean;
  /** e.g. "nog 800 kcal" while under target, "12 kcal boven doel" once over — always a concrete number, never just a percentage. */
  remainingLabel: string;
}

/**
 * Pure formatting layer over an already-computed `current`/`target` pair
 * (from `calculateNutritionTargets` + `summarizeDay`) — no new nutrition
 * math, just the display rule: how much is left to eat, or by how much the
 * target was exceeded. Kept separate from `NutrientProgressBar` so the
 * "remaining vs. over target" wording is unit-testable without rendering.
 */
export function describeNutrientProgress(current: number, target: number, unit: string): NutrientProgress {
  if (target <= 0) {
    return { percent: 0, isOverTarget: false, remainingLabel: `nog 0${unit}` };
  }

  const isOverTarget = current > target;
  const percent = Math.min(100, (current / target) * 100);
  const remainingLabel = isOverTarget
    ? `${Math.round(current - target)}${unit} boven doel`
    : `nog ${Math.round(target - current)}${unit}`;

  return { percent, isOverTarget, remainingLabel };
}
