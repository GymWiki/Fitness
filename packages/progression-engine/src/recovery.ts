/**
 * Supercompensation-window estimate for a single muscle group. This is a
 * conceptual framework, not an exact clock — different systems
 * (neuromuscular, metabolic, musculoskeletal) recover on different
 * timelines, so this gives an indicative window, never a hard promise. See
 * the "Wetenschap"-FAQ (vraag 2) for the underlying model and its limits.
 *
 * Literature baselines used as the starting point (not absolute truth):
 * neuromuscular recovery ~48-72h, metabolic ~48-96h, musculoskeletal up to
 * ~120h for heavy sessions. Smaller muscle groups and lighter sessions
 * recover faster than large, heavy ones.
 */

export type RecoveryStatus = 'recovering' | 'ready' | 'window_closing' | 'window_passed' | 'no_data';

export type MuscleGroupSize = 'small' | 'medium' | 'large';

/** Buckets the muscle-group strings already used across the app (program-generator's exercises.ts) by typical recovery demand. */
const MUSCLE_GROUP_SIZE: Record<string, MuscleGroupSize> = {
  Benen: 'large',
  'Bilspieren/Hamstrings': 'large',
  Rug: 'large',
  Borst: 'medium',
  Schouders: 'medium',
  Hamstrings: 'medium',
  Biceps: 'small',
  Triceps: 'small',
  Kuiten: 'small',
  Core: 'small',
};

const DEFAULT_SIZE: MuscleGroupSize = 'medium';

/** [windowStartHours, windowEndHours] baseline before any session/signal adjustment. */
const BASELINE_WINDOW_HOURS: Record<MuscleGroupSize, [number, number]> = {
  small: [20, 48],
  medium: [40, 72],
  large: [56, 96],
};

export function muscleGroupSize(muscleGroup: string): MuscleGroupSize {
  return MUSCLE_GROUP_SIZE[muscleGroup] ?? DEFAULT_SIZE;
}

export interface RecoverySessionInput {
  /** ISO date string of the last time this muscle group was trained. */
  performedAt: string;
  /** Total sets performed for this muscle group in that session. */
  setsCompleted: number;
  /** Average RIR (reps in reserve) across those sets — lower means the session went closer to failure. */
  averageRIR: number;
  /** Whether the session included a compound lift for this muscle group (takes longer to recover from than isolation-only work). */
  hasCompoundLift: boolean;
}

export interface RecoverySignals {
  /** Optional self-reported soreness, 1 (none) - 5 (very sore). */
  soreness?: number;
  /** Optional self-reported sleep quality, 1 (poor) - 5 (great). */
  sleepQuality?: number;
}

export interface RecoveryEstimate {
  status: RecoveryStatus;
  /** Hours elapsed since the evaluated session, or null when there's no prior session at all. */
  hoursSinceSession: number | null;
  /** Estimated window start, in hours since the session. */
  windowStartHours: number;
  /** Estimated window end, in hours since the session. */
  windowEndHours: number;
  /** User-facing explanation (Dutch), always present and deterministic — never LLM-generated. */
  explanation: string;
}

function heavinessMultiplier(session: RecoverySessionInput, signals: RecoverySignals): number {
  let multiplier = 1;

  // Lower RIR (closer to failure) increases fatigue and lengthens the estimated window.
  if (session.averageRIR <= 1) multiplier *= 1.2;
  else if (session.averageRIR >= 3) multiplier *= 0.85;

  // More total sets is more accumulated fatigue for that muscle group.
  if (session.setsCompleted >= 12) multiplier *= 1.15;
  else if (session.setsCompleted <= 4) multiplier *= 0.85;

  if (session.hasCompoundLift) multiplier *= 1.1;

  if (signals.soreness !== undefined && signals.soreness >= 4) multiplier *= 1.15;
  if (signals.sleepQuality !== undefined && signals.sleepQuality <= 2) multiplier *= 1.1;

  return multiplier;
}

/**
 * Estimates where a muscle group sits in its supercompensation cycle:
 * still recovering, in the optimal training window, the window closing, or
 * past it (back toward baseline). Pure and deterministic — no I/O, no LLM.
 */
export function estimateRecoveryState(
  muscleGroup: string,
  lastSession: RecoverySessionInput | null,
  signals: RecoverySignals = {},
  referenceDate: Date = new Date(),
): RecoveryEstimate {
  const size = muscleGroupSize(muscleGroup);
  const [baseStart, baseEnd] = BASELINE_WINDOW_HOURS[size];

  if (!lastSession) {
    return {
      status: 'no_data',
      hoursSinceSession: null,
      windowStartHours: baseStart,
      windowEndHours: baseEnd,
      explanation: `Nog geen eerdere sessie gelogd voor ${muscleGroup} — je kunt direct trainen.`,
    };
  }

  const multiplier = heavinessMultiplier(lastSession, signals);
  const windowStartHours = Math.round(baseStart * multiplier);
  const windowEndHours = Math.round(baseEnd * multiplier);
  const windowClosingStartHours = Math.round(windowStartHours + (windowEndHours - windowStartHours) * 0.75);

  const hoursSinceSession = Math.max(0, (referenceDate.getTime() - new Date(lastSession.performedAt).getTime()) / (1000 * 60 * 60));
  const hoursRounded = Math.round(hoursSinceSession);

  if (hoursSinceSession < windowStartHours) {
    const hoursRemaining = Math.round(windowStartHours - hoursSinceSession);
    return {
      status: 'recovering',
      hoursSinceSession: hoursRounded,
      windowStartHours,
      windowEndHours,
      explanation: `Nog aan het herstellen van de laatste sessie voor ${muscleGroup} (${hoursRounded} uur geleden). Het venster opent naar schatting over ~${hoursRemaining} uur.`,
    };
  }

  if (hoursSinceSession < windowClosingStartHours) {
    return {
      status: 'ready',
      hoursSinceSession: hoursRounded,
      windowStartHours,
      windowEndHours,
      explanation: `Je supercompensatie-venster voor ${muscleGroup} is nu open — een goed moment om te trainen en door te bouwen op je vooruitgang.`,
    };
  }

  if (hoursSinceSession <= windowEndHours) {
    const hoursLeft = Math.round(windowEndHours - hoursSinceSession);
    return {
      status: 'window_closing',
      hoursSinceSession: hoursRounded,
      windowStartHours,
      windowEndHours,
      explanation: `Het venster voor ${muscleGroup} loopt bijna af (~${hoursLeft} uur nog) — nu trainen bouwt nog door, wacht je langer dan zak je terug richting je basisniveau.`,
    };
  }

  return {
    status: 'window_passed',
    hoursSinceSession: hoursRounded,
    windowStartHours,
    windowEndHours,
    explanation: `Het geschatte venster voor ${muscleGroup} is voorbij — nog steeds prima om te trainen, maar dit is niet meer het extra-boost-moment.`,
  };
}
