import type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';
import { STATUS_LABEL } from './recoveryLabels';

/**
 * Ring-fill percentage (0-100) for the Apple Watch-style readiness rings —
 * a display-only concern layered on top of the already-computed
 * `RecoveryEstimate`, same as `recoveryColor.ts`. No new recovery math: a
 * muscle group's actual recovery only ever moves in one direction (you
 * don't "un-recover" once you've reached the window), so the ring fills
 * from 0% to 100% purely during the 'recovering' phase and then simply
 * stays full — 'ready'/'window_closing'/'window_passed'/'no_data' are all
 * states where the muscle has already reached (or never needed) that
 * threshold. The ring's *color* (via `recoveryColor()`) is what carries the
 * "window closing soon" urgency, not the fill amount.
 */
export function recoveryReadinessPercent(estimate: RecoveryEstimate): number {
  if (estimate.status !== 'recovering') return 100;
  if (estimate.hoursSinceSession === null || estimate.windowStartHours <= 0) return 0;
  const fraction = Math.max(0, Math.min(1, estimate.hoursSinceSession / estimate.windowStartHours));
  return Math.round(fraction * 100);
}

/**
 * Compact label shown in/under each ring. Reuses `STATUS_LABEL` for every
 * status except 'recovering', where a concrete hours-remaining countdown
 * ("18u te gaan") is more actionable than a static "Herstellend" — the
 * same underlying number the recovery engine's own explanation text
 * already states in prose.
 */
export function recoveryRingLabel(estimate: RecoveryEstimate): string {
  if (estimate.status === 'recovering' && estimate.hoursSinceSession !== null) {
    const hoursRemaining = Math.max(0, Math.round(estimate.windowStartHours - estimate.hoursSinceSession));
    return `${hoursRemaining}u te gaan`;
  }
  return STATUS_LABEL[estimate.status];
}

export interface MuscleRecoveryTapInfo {
  muscleGroup: string;
  statusLabel: string;
  explanation: string;
}

/**
 * Formats the content for the ring tap card, pulled directly from the
 * current `RecoveryEstimate` — always the live, current explanation, never
 * a stale/cached copy. Pure so it's testable without rendering anything.
 * (Carried over unchanged from the earlier body-diagram's
 * `describeRegionTap` — same contract, new name to match "ring" instead of
 * "region" now that there's no SVG geometry involved.)
 */
export function describeMuscleRecoveryTap(muscleGroup: string, estimate: RecoveryEstimate): MuscleRecoveryTapInfo {
  return {
    muscleGroup,
    statusLabel: STATUS_LABEL[estimate.status],
    explanation: estimate.explanation,
  };
}

/**
 * Sort priority for the readiness grid — lower sorts first ("meest
 * herstelde/klaar-om-te-trainen bovenaan"). `window_closing` ranks above
 * plain `ready` on purpose: both are fully recovered, but a closing window
 * is time-sensitive ("train now or lose the bonus"), which is more
 * actionable to surface first than a window that just opened and isn't
 * going anywhere yet. `window_passed` sorts last: still perfectly trainable,
 * but carries no extra supercompensation signal, so there's no urgency to
 * put it above muscle groups that are still actively recovering.
 */
const STATUS_PRIORITY: Record<RecoveryStatus, number> = {
  window_closing: 0,
  ready: 1,
  no_data: 2,
  recovering: 3,
  window_passed: 4,
};

/**
 * Comparator for `Array.prototype.sort` over `[muscleGroup, estimate]`
 * pairs. Within the 'recovering' bucket, the muscle group closest to its
 * window (highest ring-fill percentage) sorts first — "almost ready" is
 * more actionable than "just trained".
 */
export function compareMuscleRecoveryPriority(a: [string, RecoveryEstimate], b: [string, RecoveryEstimate]): number {
  const [, estimateA] = a;
  const [, estimateB] = b;
  const priorityDelta = STATUS_PRIORITY[estimateA.status] - STATUS_PRIORITY[estimateB.status];
  if (priorityDelta !== 0) return priorityDelta;
  return recoveryReadinessPercent(estimateB) - recoveryReadinessPercent(estimateA);
}
