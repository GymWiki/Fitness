import type { RecoveryEstimate, RecoveryStatus } from './recovery';

export interface RecoveryCurvePoint {
  /** Hours since the evaluated session (illustrative time axis). */
  hoursFromSession: number;
  /** Illustrative recovery level, 100 = baseline. Not a physiological unit. */
  level: number;
  /**
   * Cosmetic-only phase classification for this point, used purely to color
   * the curve segment-by-segment. Never used for the `now` point — that
   * status is always copied verbatim from the source `RecoveryEstimate`
   * (see `generateRecoveryCurve`), so a rounding difference here can never
   * make the curve contradict the ring/text for the actual current moment.
   */
  status: RecoveryStatus;
}

export interface RecoveryCurve {
  muscleGroup: string;
  /** The illustrative baseline level (100) every curve is drawn relative to. */
  baseline: number;
  windowStartHours: number;
  windowEndHours: number;
  /** Hour at which the illustrative curve reaches its supercompensation peak (phase 3 -> 4 boundary). */
  peakHours: number;
  /** Hour at which the illustrative curve has fully decayed back to baseline (end of phase 4). */
  decayEndHours: number;
  points: RecoveryCurvePoint[];
  /** Where this muscle group sits on the curve right now. */
  now: RecoveryCurvePoint;
}

const BASELINE_LEVEL = 100;
/** Dip depth and peak height are deliberately equal, per the illustrative model's symmetric bowl/hill design. */
const AMPLITUDE = 20;
const SAMPLE_COUNT = 48;

function easeInOut(fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

/**
 * Cosmetic-only phase classification for an arbitrary point in illustrative
 * time — mirrors `estimateRecoveryState`'s thresholds, but is deliberately
 * never used for the `now` point (see `RecoveryCurvePoint.status`).
 */
function illustrativeStatus(hoursFromSession: number, windowStartHours: number, windowEndHours: number): RecoveryStatus {
  const windowClosingStartHours = Math.round(windowStartHours + (windowEndHours - windowStartHours) * 0.75);
  if (hoursFromSession < windowStartHours) return 'recovering';
  if (hoursFromSession < windowClosingStartHours) return 'ready';
  if (hoursFromSession <= windowEndHours) return 'window_closing';
  return 'window_passed';
}

/**
 * Turns a `RecoveryEstimate` into an illustrative supercompensation curve —
 * one smooth, continuous line with four phases:
 *   1. starts on baseline right at the session,
 *   2. dips below baseline (fatigue) and bends back up, re-crossing baseline
 *      exactly at `windowStartHours` (phase 1+2, duration D),
 *   3. keeps rising above baseline to a peak (supercompensation),
 *   4. bends back down to baseline (phase 3+4 together also take duration D,
 *      mirroring phase 1+2 — dip depth and peak height are equal too).
 * Built entirely from the estimate's own `windowStartHours` (D) — no new
 * inputs and no re-derivation of `hoursSinceSession`/`status`, so the curve
 * can never show something the ring/text don't already agree with: the
 * `now` point is the same numbers already computed by `estimateRecoveryState`,
 * not a second, possibly-diverging calculation.
 */
export function generateRecoveryCurve(muscleGroup: string, estimate: RecoveryEstimate): RecoveryCurve {
  const { windowStartHours, windowEndHours } = estimate;

  if (estimate.status === 'no_data') {
    const flatPoint: RecoveryCurvePoint = { hoursFromSession: 0, level: BASELINE_LEVEL, status: 'no_data' };
    return {
      muscleGroup,
      baseline: BASELINE_LEVEL,
      windowStartHours,
      windowEndHours,
      peakHours: windowEndHours,
      decayEndHours: windowEndHours,
      points: [flatPoint, { hoursFromSession: windowEndHours, level: BASELINE_LEVEL, status: 'no_data' }],
      now: flatPoint,
    };
  }

  // Phase 1+2 (training + recovery) takes D hours: baseline -> trough -> back to baseline.
  const phase12Duration = windowStartHours;
  const troughHours = phase12Duration * 0.5;
  const dipLevel = BASELINE_LEVEL - AMPLITUDE;

  // Phase 3+4 (supercompensation + decay) also takes D hours, split evenly: baseline -> peak -> back to baseline.
  const peakHours = windowStartHours + phase12Duration * 0.5;
  const peakLevel = BASELINE_LEVEL + AMPLITUDE;
  const decayEndHours = windowStartHours + phase12Duration;

  const anchors: Array<{ hoursFromSession: number; level: number }> = [
    { hoursFromSession: 0, level: BASELINE_LEVEL },
    { hoursFromSession: troughHours, level: dipLevel },
    { hoursFromSession: windowStartHours, level: BASELINE_LEVEL },
    { hoursFromSession: peakHours, level: peakLevel },
    { hoursFromSession: decayEndHours, level: BASELINE_LEVEL },
  ];

  function levelAt(hours: number): number {
    if (hours <= anchors[0]!.hoursFromSession) return anchors[0]!.level;
    for (let i = 1; i < anchors.length; i++) {
      const next = anchors[i]!;
      if (hours <= next.hoursFromSession) {
        const prev = anchors[i - 1]!;
        const span = next.hoursFromSession - prev.hoursFromSession;
        const fraction = span <= 0 ? 1 : (hours - prev.hoursFromSession) / span;
        return prev.level + (next.level - prev.level) * easeInOut(fraction);
      }
    }
    return BASELINE_LEVEL;
  }

  const horizonHours = Math.max(decayEndHours, (estimate.hoursSinceSession ?? 0) * 1.1);

  // Sample evenly across the horizon, but also always include the exact phase
  // boundary hours (so area fills can split precisely at the baseline
  // crossings and the peak, without interpolating a boundary in the UI layer).
  const sampledHours = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => (horizonHours * i) / SAMPLE_COUNT);
  const boundaryHours = anchors.map((anchor) => anchor.hoursFromSession).filter((hours) => hours <= horizonHours);
  const allHours = [...new Set([...sampledHours, ...boundaryHours])].sort((a, b) => a - b);

  const points: RecoveryCurvePoint[] = allHours.map((hoursFromSession) => ({
    hoursFromSession,
    level: levelAt(hoursFromSession),
    status: illustrativeStatus(hoursFromSession, windowStartHours, windowEndHours),
  }));

  const nowHours = estimate.hoursSinceSession ?? 0;
  const now: RecoveryCurvePoint = { hoursFromSession: nowHours, level: levelAt(nowHours), status: estimate.status };

  return { muscleGroup, baseline: BASELINE_LEVEL, windowStartHours, windowEndHours, peakHours, decayEndHours, points, now };
}
