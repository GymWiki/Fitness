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
  points: RecoveryCurvePoint[];
  /** Where this muscle group sits on the curve right now. */
  now: RecoveryCurvePoint;
}

const BASELINE_LEVEL = 100;
const DIP_DEPTH = 20;
const PEAK_HEIGHT = 15;
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
 * Turns a `RecoveryEstimate` into an illustrative supercompensation curve:
 * a dip right after training, a rise back through baseline as the window
 * opens, a peak inside the window, then a gradual decay back to baseline if
 * the muscle group isn't retrained. Built entirely from the estimate's own
 * `windowStartHours`/`windowEndHours`/`hoursSinceSession`/`status` — no new
 * inputs and no re-derivation of those fields, so the curve can never show
 * something the ring/text don't already agree with: the `now` point is the
 * same numbers already computed by `estimateRecoveryState`, not a second,
 * possibly-diverging calculation.
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
      points: [flatPoint, { hoursFromSession: windowEndHours, level: BASELINE_LEVEL, status: 'no_data' }],
      now: flatPoint,
    };
  }

  const peakHours = windowStartHours + (windowEndHours - windowStartHours) * 0.4;
  const peakLevel = BASELINE_LEVEL + PEAK_HEIGHT;
  const closingLevel = BASELINE_LEVEL + PEAK_HEIGHT * 0.3;
  const decayEndHours = windowEndHours + (windowEndHours - windowStartHours) * 1.2;
  const dipLevel = BASELINE_LEVEL - DIP_DEPTH;

  const anchors: RecoveryCurvePoint[] = [
    { hoursFromSession: 0, level: dipLevel, status: 'recovering' },
    { hoursFromSession: windowStartHours, level: BASELINE_LEVEL, status: 'ready' },
    { hoursFromSession: peakHours, level: peakLevel, status: 'ready' },
    { hoursFromSession: windowEndHours, level: closingLevel, status: 'window_closing' },
    { hoursFromSession: decayEndHours, level: BASELINE_LEVEL, status: 'window_passed' },
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

  const points: RecoveryCurvePoint[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const hoursFromSession = (horizonHours * i) / SAMPLE_COUNT;
    points.push({
      hoursFromSession,
      level: levelAt(hoursFromSession),
      status: illustrativeStatus(hoursFromSession, windowStartHours, windowEndHours),
    });
  }

  const nowHours = estimate.hoursSinceSession ?? 0;
  const now: RecoveryCurvePoint = { hoursFromSession: nowHours, level: levelAt(nowHours), status: estimate.status };

  return { muscleGroup, baseline: BASELINE_LEVEL, windowStartHours, windowEndHours, points, now };
}
