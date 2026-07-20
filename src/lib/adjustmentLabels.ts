import type { AdjustmentType } from '@fitness/adaptation-planner';

/** Dutch labels for program_adjustments.adjustment_type, shared by the week-review and adjustment-history screens. */
export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  volume_increase: 'Volume omhoog',
  volume_decrease: 'Volume omlaag',
  deload: 'Deload-week',
  reduce_days: 'Schema verkleinen',
};

export function adjustmentTitle(type: AdjustmentType, exerciseName?: string | null): string {
  const label = ADJUSTMENT_LABELS[type];
  return exerciseName ? `${label}: ${exerciseName}` : label;
}
