import type { RecoveryEstimate } from '@fitness/progression-engine';
import { colors } from '@/theme/colors';

/**
 * Maps a `RecoveryEstimate` to a single hex color for the readiness rings
 * (see app/readiness.tsx) — a display-only concern, built entirely from
 * fields the recovery function already exposes (status, hoursSinceSession,
 * windowStartHours, windowEndHours). No new recovery thresholds or math
 * live here; this never recomputes when a muscle group is "ready", it only
 * decides what shade to paint the already-computed answer.
 *
 * The result is a continuous gradient rather than five flat colors, so the
 * rings read like a meter (matching the supercompensation curve's actual
 * shape: fatigue -> rising readiness -> peak -> gentle decay) instead of a
 * simple traffic light: red (just trained) -> orange (approaching the
 * window) -> green (ready, the peak) -> orange-tinted green (window
 * closing) -> grey (window passed). Status is always additionally shown as
 * text elsewhere (see STATUS_LABEL in recoveryLabels.ts) — color is
 * never the only signal.
 */
export function recoveryColor(estimate: RecoveryEstimate): string {
  switch (estimate.status) {
    case 'no_data':
      return colors.accent;
    case 'recovering': {
      const fraction = recoveringFraction(estimate);
      return interpolateHex(colors.danger, colors.warning, fraction);
    }
    case 'ready':
      return colors.accent;
    case 'window_closing': {
      const fraction = closingFraction(estimate);
      return interpolateHex(colors.accent, colors.warning, fraction);
    }
    case 'window_passed':
      return colors.textTertiary;
  }
}

/** 0 = session just happened, 1 = right at the window's opening edge. */
function recoveringFraction(estimate: RecoveryEstimate): number {
  if (estimate.hoursSinceSession === null || estimate.windowStartHours <= 0) return 0;
  return clamp01(estimate.hoursSinceSession / estimate.windowStartHours);
}

/** 0 = right at the window's opening edge, 1 = right at the window's closing edge. */
function closingFraction(estimate: RecoveryEstimate): number {
  const totalHours = estimate.windowEndHours - estimate.windowStartHours;
  if (estimate.hoursSinceSession === null || totalHours <= 0) return 0;
  return clamp01((estimate.hoursSinceSession - estimate.windowStartHours) / totalHours);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateHex(fromHex: string, toHex: string, fraction: number): string {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const t = clamp01(fraction);
  return rgbToHex([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]);
}
